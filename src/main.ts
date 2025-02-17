import { getOctokit } from "@actions/github"
import * as core from "@actions/core"
import { PulumiEstimator } from "./estimators/pulumiEstimator"
import { TerraformEstimator } from "./estimators/terraformEstimator"
import { GPT4Service } from "./services/gpt4Service"

const estimators = [new TerraformEstimator(), new PulumiEstimator()]

export interface EstimatorResponse {
    baseCost: number // estimated fixed monthly cost
    variableCosts: { low: number; medium: number; high: number } // variable monthly cost estimates based on usage
    serviceChanges: string[] // list of changes such as added, modified, or removed resources
    detailedCosts: {
        resourceName: string // name of the resource
        resourceType: string // type of the resource
        baseCostEstimate: number // estimated fixed monthly cost for the resource
        variableCostEstimate: { low: number; medium: number; high: number } // variable cost estimates for the resource
    }[]
    notes: string[] // list of notes about the cost estimation
    low_assumptions: string[] // list of assumptions for the low usage scenario
    medium_assumptions: string[] // list of assumptions for the medium usage scenario
    high_assumptions: string[] // list of assumptions for the high usage scenario
}

export function generateCostReport(analyses: string[]): string {
    let totalBaseCost = 0
    let totalVariableCosts = { low: 0, medium: 0, high: 0 }
    const allServiceChanges: EstimatorResponse["serviceChanges"] = []
    const detailedCosts: EstimatorResponse["detailedCosts"] = []
    const notes: EstimatorResponse["notes"] = []
    const lowAssumptions: EstimatorResponse["low_assumptions"] = []
    const mediumAssumptions: EstimatorResponse["medium_assumptions"] = []
    const highAssumptions: EstimatorResponse["high_assumptions"] = []

    // Parse and combine all analyses
    analyses.forEach((analysis, index) => {
        try {
            const data: EstimatorResponse = JSON.parse(analysis)
            totalBaseCost += data.baseCost
            totalVariableCosts.low += data.variableCosts.low
            totalVariableCosts.medium += data.variableCosts.medium
            totalVariableCosts.high += data.variableCosts.high

            allServiceChanges.push(...data.serviceChanges)
            detailedCosts.push(...data.detailedCosts)
            notes.push(...data.notes)
            lowAssumptions.push(...data.low_assumptions)
            mediumAssumptions.push(...data.medium_assumptions)
            highAssumptions.push(...data.high_assumptions)
        } catch (e) {
            console.error(`Failed to parse analysis: `, e)
        }
    })

    return `## Cost Estimation

**Quick Summary**:
- **Base Cost**: $${totalBaseCost.toFixed(2)}

- **Variable Cost**:
  - **Low Usage**: $${totalVariableCosts.low.toFixed(2)}
  - **Medium Usage**: $${totalVariableCosts.medium.toFixed(2)}
  - **High Usage**: $${totalVariableCosts.high.toFixed(2)}

**Service Changes**:
${allServiceChanges.map((change) => `- ${change}`).join("\n")}

### Cost Summary
${generateCostTable(detailedCosts)}

**Assumptions**:
- **Low Usage**: ${lowAssumptions
        .map((assumption) => `- ${assumption}`)
        .join("\n")}
- **Medium Usage**: ${mediumAssumptions
        .map((assumption) => `- ${assumption}`)
        .join("\n")}
- **High Usage**: ${highAssumptions
        .map((assumption) => `- ${assumption}`)
        .join("\n")}

**Notes**:
${notes.map((note) => `- ${note}`).join("\n")}

**Disclaimer**: ⚠️  
These cost estimates are indicative only. Actual costs may vary due to regional pricing differences, varying usage patterns, and changes in AWS pricing. This tool is designed to provide a general guideline for the cost impact of IaC changes and should not be used as the sole basis for financial or operational decisions.`
}

export function generateCostTable(
    detailedCosts: EstimatorResponse["detailedCosts"]
): string {
    const headers = [
        "**Service**",
        "**Base Cost**",
        "**Low Usage**",
        "**Medium Usage**",
        "**High Usage**",
    ]
    const rows = detailedCosts.map((cost) => [
        cost.resourceName,
        `$${cost.baseCostEstimate.toFixed(2)}`,
        `$${cost.variableCostEstimate.low.toFixed(2)}`,
        `$${cost.variableCostEstimate.medium.toFixed(2)}`,
        `$${cost.variableCostEstimate.high.toFixed(2)}`,
    ])

    return `| ${headers.join(" | ")} |\n| ${headers
        .map(() => "---")
        .join(" | ")} |\n${rows
        .map((row) => `| ${row.join(" | ")} |`)
        .join("\n")}`
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

        const iacStack = core.getInput("iac-stack")
        const iacDir = core.getInput("iac-dir")

        let analyses: string[] = []
        for (const estimator of estimators) {
            if (estimator.getIaCType() === iacStack) {
                analyses.push(
                    await estimator.analyze(
                        iacDir,
                        new GPT4Service(openaiApiKey)
                    )
                )
                break
            }
        }

        if (analyses.length === 0) {
            throw new Error(
                `No estimator found for IaC stack '${iacStack}'. Supported stacks are: ${estimators
                    .map((e) => e.getIaCType())
                    .join(", ")}.`
            )
        }

        const comment = generateCostReport(analyses)

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
