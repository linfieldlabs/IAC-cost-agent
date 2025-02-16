import * as core from "@actions/core"
import { context } from "@actions/github"
import run from "./src/main"

try {
    const githubToken = process.env.GITHUB_TOKEN
    const openaiApiKey = process.env.OPENAI_API_KEY

    const prNumber = context?.payload?.pull_request?.number
    const { owner, repo } = context?.repo

    if (!githubToken) {
        throw new Error("GitHub token not found")
    }

    if (!openaiApiKey) {
        throw new Error("OpenAI API key not found")
    }

    if (!prNumber) {
        throw new Error("Pull Request number is not found")
    }

    run(githubToken, openaiApiKey, repo, owner, prNumber)
} catch (error) {
    core.setFailed((error as Error).message)
}
