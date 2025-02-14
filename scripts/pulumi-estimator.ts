import { exec } from "@actions/exec"
import { OpenAIService } from "../services/openai-service"
import * as path from "path"

async function findPulumiDirectories(): Promise<string[]> {
    let pulumiFiles = ""
    const baseRef = process.env.GITHUB_BASE_REF || "main"
    await exec("git", ["fetch", "origin", baseRef], {})
    await exec("git", ["diff", "--name-only", `origin/${baseRef}`], {
        listeners: {
            stdout: (data: Buffer) => {
                pulumiFiles += data.toString()
            },
        },
    })

    const directories = new Set<string>()
    pulumiFiles
        .split("\n")
        .filter(
            (file) =>
                file.endsWith("Pulumi.yaml") || file.endsWith("Pulumi.yml")
        )
        .forEach((file) => {
            directories.add(path.dirname(file))
        })

    return Array.from(directories)
}

async function generatePulumiPreview(directory: string): Promise<string> {
    const options = {
        cwd: directory,
        env: {
            ...process.env,
            PULUMI_CONFIG_PASSPHRASE: "dummy-passphrase",
        },
    }

    await exec("npm", ["install"], options)

    await exec("pulumi", ["login", "--local"], options)

    await exec("pulumi", ["stack", "select", "dev"], options).catch(
        async () => {
            await exec("pulumi", ["stack", "init", "dev"], options)
        }
    )

    let previewContent = ""
    await exec("pulumi", ["preview", "--json"], {
        ...options,
        listeners: {
            stdout: (data: Buffer) => {
                previewContent += data.toString()
            },
        },
    })

    return previewContent
}

async function analyzePulumiPreview(
    openaiService: OpenAIService,
    previewContent: string,
    directory: string
): Promise<string> {
    return openaiService.analyzePulumiPlan(previewContent)
}

export default async function runPulumiEstimator(
    pulumiDir: string,
    openaiApiKey: string
): Promise<string[]> {
    const openaiService = new OpenAIService(openaiApiKey)

    let pulumiDirs: string[]
    if (pulumiDir !== "") {
        pulumiDirs = [pulumiDir]
    } else {
        pulumiDirs = await findPulumiDirectories()
    }

    console.log("Found Pulumi directories:")
    pulumiDirs.forEach((dir) => console.log(dir))

    const analyses = await Promise.all(
        pulumiDirs.map(async (dir) => {
            try {
                const previewContent = await generatePulumiPreview(dir)
                return await analyzePulumiPreview(
                    openaiService,
                    previewContent,
                    dir
                )
            } catch (error) {
                console.error(`Failed to analyze directory ${dir}:`, error)
                return null
            }
        })
    )

    return analyses.filter((analysis): analysis is string => analysis !== null)
}
