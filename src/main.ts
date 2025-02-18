import { getOctokit } from "@actions/github"
import * as core from "@actions/core"
import { PulumiEstimator } from "./estimators/pulumiEstimator"
import { TerraformEstimator } from "./estimators/terraformEstimator"
import { GPT4Service } from "./services/gpt4Service"

const estimators = [new TerraformEstimator(), new PulumiEstimator()]

export interface EstimatorResponse {
    analysis_note: string // descriptive analysis and your thought process in approaching the problem
    resources_names: string[] // list of resource names
    resources: {
        resource_name: string // name of the resource
        resource_type: string // type of the resource
        change_to_resource: string // change to the resource, e.g. "create", "update", "increase memory" etc
        base_cost_analysis: string // thought process and cost breakdown for base cost
        base_cost: number // estimated fixed monthly cost for the resource
        average_usage_assumptions_and_analysis: string // assumptions and analysis for average usage including cost breakdown
        average_usage_cost: number // estimated cost for average usage scenario
        high_usage_assumptions_and_analysis: string // assumptions and analysis for high usage including cost breakdown
        high_usage_cost: number // estimated cost for high usage scenario
        low_usage_assumptions_and_analysis: string // assumptions and analysis for low usage including cost breakdown
        low_usage_cost: number // estimated cost for low usage scenario
        notes: string[] // notes about the cost estimation for the resource
    }[]
}

export function generateCostReport(analysis: string): string {
    let totalBaseCost = 0
    let totalVariableCosts = { low: 0, average: 0, high: 0 }
    const allServiceChanges: string[] = []
    const detailedCosts: Array<{
        service: string
        baseCost: number
        lowUsage: number
        averageUsage: number
        highUsage: number
    }> = []
    const notes: string[] = []
    const lowAssumptions: string[] = []
    const averageAssumptions: string[] = []
    const highAssumptions: string[] = []

    try {
        const data: EstimatorResponse = JSON.parse(analysis)
        data.resources.forEach((resource) => {
            totalBaseCost += resource.base_cost
            totalVariableCosts.low += resource.low_usage_cost
            totalVariableCosts.average += resource.average_usage_cost
            totalVariableCosts.high += resource.high_usage_cost

            if (resource.change_to_resource) {
                allServiceChanges.push(resource.change_to_resource)
            }

            detailedCosts.push({
                service: resource.resource_name,
                baseCost: resource.base_cost,
                lowUsage: resource.low_usage_cost,
                averageUsage: resource.average_usage_cost,
                highUsage: resource.high_usage_cost,
            })

            if (resource.notes && resource.notes.length > 0) {
                notes.push(...resource.notes)
            }

            if (resource.low_usage_assumptions_and_analysis) {
                lowAssumptions.push(resource.low_usage_assumptions_and_analysis)
            }
            if (resource.average_usage_assumptions_and_analysis) {
                averageAssumptions.push(
                    resource.average_usage_assumptions_and_analysis
                )
            }
            if (resource.high_usage_assumptions_and_analysis) {
                highAssumptions.push(
                    resource.high_usage_assumptions_and_analysis
                )
            }
        })
    } catch (e) {
        console.error(`Failed to parse analysis: `, e)
    }

    return `## Cost Estimation

**Quick Summary**:
- **Base Cost**: $${totalBaseCost.toFixed(2)}

- **Variable Cost**:
  - **Low Usage**: $${totalVariableCosts.low.toFixed(2)}
  - **Average Usage**: $${totalVariableCosts.average.toFixed(2)}
  - **High Usage**: $${totalVariableCosts.high.toFixed(2)}

**Service Changes**:
${
    allServiceChanges.length > 0
        ? allServiceChanges.map((change) => `- ${change}`).join("\n")
        : "No service changes detected."
}

### Cost Summary
${generateCostTable(detailedCosts)}

**Assumptions**:
- **Low Usage**:
  ${
      lowAssumptions.length > 0
          ? lowAssumptions.map((assumption) => `- ${assumption}`).join("\n")
          : "- No low usage assumptions provided."
  }
- **Average Usage**:
  ${
      averageAssumptions.length > 0
          ? averageAssumptions.map((assumption) => `- ${assumption}`).join("\n")
          : "- No average usage assumptions provided."
  }
- **High Usage**:
  ${
      highAssumptions.length > 0
          ? highAssumptions.map((assumption) => `- ${assumption}`).join("\n")
          : "- No high usage assumptions provided."
  }

**Notes**:
${
    notes.length > 0
        ? notes.map((note) => `- ${note}`).join("\n")
        : "- No additional notes."
}

**Disclaimer**: ⚠️  
These cost estimates are indicative only. Actual costs may vary due to regional pricing differences, varying usage patterns, and changes in AWS pricing. This tool is designed to provide a general guideline for the cost impact of IaC changes and should not be used as the sole basis for financial or operational decisions.`
}

export function generateCostTable(
    detailedCosts: Array<{
        service: string
        baseCost: number
        lowUsage: number
        averageUsage: number
        highUsage: number
    }>
): string {
    console.log("########################")
    console.log(detailedCosts)
    const headers = [
        "**Service**",
        "**Base Cost**",
        "**Low Usage**",
        "**Average Usage**",
        "**High Usage**",
    ]
    const rows = detailedCosts.map((cost) => [
        cost.service,
        `$${cost.baseCost.toFixed(2)}`,
        `$${cost.lowUsage.toFixed(2)}`,
        `$${cost.averageUsage.toFixed(2)}`,
        `$${cost.highUsage.toFixed(2)}`,
    ])

    const headerRow = `| ${headers.join(" | ")} |`
    const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`

    const tableRows = rows.map((row) => `| ${row.join(" | ")} |`).join("\n")

    return `${headerRow}\n${separatorRow}\n${tableRows}`
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

        let analysis: string = ""
        for (const estimator of estimators) {
            if (estimator.getIaCType() === iacStack) {
                analysis = await estimator.analyze(
                    iacDir,
                    new GPT4Service(openaiApiKey)
                )
                break
            }
        }

        if (analysis === "") {
            throw new Error(
                `No estimator found for IaC stack '${iacStack}'. Supported stacks are: ${estimators
                    .map((e) => e.getIaCType())
                    .join(", ")}.`
            )
        }

        console.log("LLM Response:\n")
        console.log(analysis)

        const comment = generateCostReport(analysis)

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
