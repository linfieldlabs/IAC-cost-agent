import { BaseEstimator } from "./baseEstimator"
import { exec } from "@actions/exec"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"

export class TerraformEstimator extends BaseEstimator {
    constructor() {
        super()
    }

    async findDirectories(): Promise<string[]> {
        try {
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
        } catch (error) {
            throw new Error(`Failed to find Terraform directories: ${error}`)
        }
    }

    async generatePreview(directory: string): Promise<string> {
        try {
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
        } catch (error) {
            throw new Error(`Failed to generate Terraform preview: ${error}`)
        }
    }

    getIaCType(): string {
        return "terraform"
    }
}
