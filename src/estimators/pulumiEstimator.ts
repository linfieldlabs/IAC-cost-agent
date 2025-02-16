import { BaseEstimator } from "./baseEstimator"
import { exec } from "@actions/exec"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"

export class PulumiEstimator extends BaseEstimator {
    constructor() {
        super()
    }

    async findDirectories(): Promise<string[]> {
        try {
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
                        file.endsWith("Pulumi.yaml") ||
                        file.endsWith("Pulumi.yml")
                )
                .forEach((file) => {
                    directories.add(path.dirname(file))
                })

            return Array.from(directories)
        } catch (error) {
            throw new Error(`Failed to find Terraform directories: ${error}`)
        }
    }

    async generatePreview(directory: string): Promise<string> {
        try {
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
        } catch (error) {
            throw new Error(`Failed to generate Terraform preview: ${error}`)
        }
    }

    getIaCType(): string {
        return "pulumi"
    }
}
