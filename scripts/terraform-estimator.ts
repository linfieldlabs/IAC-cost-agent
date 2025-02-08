import { exec } from "@actions/exec"
import { getOctokit } from "@actions/github"
import * as core from "@actions/core"

export default async function run(
    githubToken: string,
    openaiApiKey: string,
    repo: string,
    owner: string,
    prNumber: number
) {
    try {
        const octokit = getOctokit(githubToken)

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

        const terraformFiles = tfFiles
            .split("\n")
            .filter((file) => file.endsWith(".tf"))
            .filter(Boolean) // Remove empty strings

        console.log("Found Terraform files:")
        terraformFiles.forEach((file) => console.log(file))

        const comment =
            terraformFiles.length === 0
                ? "No Terraform files (`.tf`) were found in this PR."
                : `### Terraform Files Found\n\nThe following Terraform files were found in this PR:\n\n${terraformFiles
                      .map((file) => `- ${file}`)
                      .join("\n")}`

        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body: comment,
        })
    } catch (error) {
        core.setFailed(`Action failed: ${error}`)
    }
}
