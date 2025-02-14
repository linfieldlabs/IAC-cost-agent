import { exec } from "@actions/exec"
import { OpenAIService } from "../services/openai-service"
import * as path from "path"
import * as fs from "fs"

async function findTerraformDirectories(): Promise<string[]> {
    let tfFiles = ""
    const baseRef = process.env.GITHUB_BASE_REF || "main"
    await exec("git", ["fetch", "origin", baseRef], {})
    await exec("git", ["diff", "--name-only", `origin/${baseRef}`], {
        listeners: {
            stdout: (data: Buffer) => {
                tfFiles += data.toString()
            },
        },
    })

    const directories = new Set<string>()
    tfFiles
        .split("\n")
        .filter((file) => file.endsWith(".tf"))
        .forEach((file) => {
            directories.add(path.dirname(file))
        })

    return Array.from(directories)
}

async function generateTerraformPlan(directory: string): Promise<string> {
    await exec("terraform", ["init"], { cwd: directory })

    await exec("terraform", ["plan", "-out=tfplan"], { cwd: directory })

    let planContent = ""
    await exec("terraform", ["show", "-json", "tfplan"], {
        cwd: directory,
        listeners: {
            stdout: (data: Buffer) => {
                planContent += data.toString()
            },
        },
    })

    fs.unlinkSync(path.join(directory, "tfplan"))

    return planContent
}

async function analyzeTerraformPlan(
    openaiService: OpenAIService,
    planContent: string,
    directory: string
): Promise<string> {
    return openaiService.analyzeTerraformPlan(planContent)
}

export default async function runTerraformEstimator(
    iacDir: string,
    openaiApiKey: string
): Promise<string[]> {
    const openaiService = new OpenAIService(openaiApiKey)

    let terraformDirs: string[]
    if (iacDir !== "") {
        terraformDirs = [iacDir]
    } else {
        terraformDirs = await findTerraformDirectories()
    }

    console.log("Found Terraform directories:")
    terraformDirs.forEach((dir) => console.log(dir))

    const analyses = await Promise.all(
        terraformDirs.map(async (dir) => {
            try {
                const planContent = await generateTerraformPlan(dir)
                return await analyzeTerraformPlan(
                    openaiService,
                    planContent,
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
