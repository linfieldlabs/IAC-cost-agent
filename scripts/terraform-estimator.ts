import { exec } from "@actions/exec"
import { getOctokit } from "@actions/github"
import * as core from "@actions/core"
import OpenAI from "openai"

// todo
// variable cost scenarios should depend on the type of resource

async function analyzeTerraformFile(
    openai: OpenAI,
    filePath: string
): Promise<string> {
    let fileContent = ""
    await exec("git", ["show", `:${filePath}`], {
        listeners: {
            stdout: (data: Buffer) => {
                fileContent += data.toString()
            },
        },
    })

    const prompt = `Analyze the following Terraform configuration and provide a cost estimation report following these requirements:

1. Identify all AWS resources and their configurations
2. Calculate estimated costs for:
   - Base Cost (fixed monthly charges)
   - Variable Cost scenarios:
     * Low Usage (10k requests/month, 5GB storage, 1GB egress)
     * Medium Usage (100k requests/month, 20GB storage, 5GB egress)
     * High Usage (1M requests/month, 100GB storage, 50GB egress)
3. List all service changes (added, modified, or removed resources)
4. Format the response as a structured JSON with the following fields:
   - baseCost
   - variableCosts: { low, medium, high }
   - serviceChanges: string[]
   - detailedCosts: Array of service-specific costs

Do not include any other text or comments in your response.

Here's the Terraform configuration:

${fileContent}`

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
    })

    console.log("Response:", response.choices[0].message.content)

    return response.choices[0].message.content || ""
}

export default async function run(
    githubToken: string,
    openaiApiKey: string,
    repo: string,
    owner: string,
    prNumber: number
) {
    try {
        const octokit = getOctokit(githubToken)
        const openai = new OpenAI({ apiKey: openaiApiKey })

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

        const analyses = await Promise.all(
            terraformFiles.map((file) => analyzeTerraformFile(openai, file))
        )

        const comment = generateCostReport(terraformFiles, analyses)

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

function generateCostReport(files: string[], analyses: string[]): string {
    let totalBaseCost = 0
    let totalVariableCosts = { low: 0, medium: 0, high: 0 }
    const allServiceChanges: string[] = []
    const detailedCosts: any[] = []

    // Parse and combine all analyses
    analyses.forEach((analysis, index) => {
        try {
            const data = JSON.parse(analysis)
            totalBaseCost += data.baseCost
            totalVariableCosts.low += data.variableCosts.low
            totalVariableCosts.medium += data.variableCosts.medium
            totalVariableCosts.high += data.variableCosts.high
            allServiceChanges.push(...data.serviceChanges)
            detailedCosts.push(...data.detailedCosts)
        } catch (e) {
            console.error(`Failed to parse analysis for ${files[index]}:`, e)
        }
    })

    return `## Terraform Cost Estimation

**Quick Summary**:
- **Base Cost**: $${totalBaseCost.toFixed(2)}

- **Variable Cost**:
  - **Low Usage**: $${totalVariableCosts.low.toFixed(
      2
  )} – (Assumes 10k req/month, 5GB storage, 1GB egress)
  - **Medium Usage**: $${totalVariableCosts.medium.toFixed(
      2
  )} – (Assumes 100k req/month, 20GB storage, 5GB egress)
  - **High Usage**: $${totalVariableCosts.high.toFixed(
      2
  )} – (Assumes 1M req/month, 100GB storage, 50GB egress)

**Service Changes**:
${allServiceChanges.map((change) => `- ${change}`).join("\n")}

### Cost Summary
${generateCostTable(detailedCosts)}

> **Note**:
> - **Base Cost** is the fixed monthly charge for provisioning a resource (e.g., hosting fees).
> - **Variable Costs** depend on usage. The assumptions for usage scenarios are:
>     - **Low Usage**: ~10,000 requests/month, 5GB storage, 1GB egress
>     - **Medium Usage**: ~100,000 requests/month, 20GB storage, 5GB egress
>     - **High Usage**: ~1,000,000 requests/month, 100GB storage, 50GB egress
> - Values in parentheses indicate the net change (Δ) compared to the previous configuration.

**Disclaimer**: ⚠️  
These cost estimates are indicative only. Actual costs may vary due to regional pricing differences, varying usage patterns, and changes in AWS pricing. This tool is designed to provide a general guideline for the cost impact of IaC changes and should not be used as the sole basis for financial or operational decisions.`
}

function generateCostTable(detailedCosts: any[]): string {
    const headers = [
        "**Service**",
        "**Base Cost**",
        "**Low Usage**",
        "**Medium Usage**",
        "**High Usage**",
    ]
    const rows = detailedCosts.map((cost) => [
        cost.service,
        `$${cost.baseCost.toFixed(2)} (${formatDelta(cost.baseCostDelta)})`,
        `$${cost.lowUsage.toFixed(2)} (${formatDelta(cost.lowUsageDelta)})`,
        `$${cost.mediumUsage.toFixed(2)} (${formatDelta(
            cost.mediumUsageDelta
        )})`,
        `$${cost.highUsage.toFixed(2)} (${formatDelta(cost.highUsageDelta)})`,
    ])

    return `| ${headers.join(" | ")} |\n| ${headers
        .map(() => "---")
        .join(" | ")} |\n${rows
        .map((row) => `| ${row.join(" | ")} |`)
        .join("\n")}`
}

function formatDelta(delta: number): string {
    if (delta === 0) return "no Δ"
    return delta > 0
        ? `+$${delta.toFixed(2)}`
        : `-$${Math.abs(delta).toFixed(2)}`
}
