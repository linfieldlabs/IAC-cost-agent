import { getOctokit } from "@actions/github"
import * as core from "@actions/core"
import { PulumiEstimator } from "./estimators/pulumiEstimator"
import { TerraformEstimator } from "./estimators/terraformEstimator"
import { MscService } from "./services/MscService"

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
    const resourceDetails: {
        resource_name: string
        notes: string[]
        lowAssumptions: string[]
        averageAssumptions: string[]
        highAssumptions: string[]
    }[] = []

    try {
        const data: EstimatorResponse = JSON.parse(analysis)
        data.resources.forEach((resource) => {
            totalBaseCost += resource.base_cost
            totalVariableCosts.low += resource.low_usage_cost
            totalVariableCosts.average += resource.average_usage_cost
            totalVariableCosts.high += resource.high_usage_cost

            if (resource.change_to_resource) {
                allServiceChanges.push(
                    `${resource.resource_name} -> ${resource.change_to_resource} (${resource.resource_type})`
                )
            }

            detailedCosts.push({
                service: resource.resource_name,
                baseCost: resource.base_cost,
                lowUsage: resource.low_usage_cost,
                averageUsage: resource.average_usage_cost,
                highUsage: resource.high_usage_cost,
            })

            resourceDetails.push({
                resource_name: resource.resource_name,
                notes: resource.notes || [],
                lowAssumptions: resource.low_usage_assumptions_and_analysis
                    ? [resource.low_usage_assumptions_and_analysis]
                    : [],
                averageAssumptions:
                    resource.average_usage_assumptions_and_analysis
                        ? [resource.average_usage_assumptions_and_analysis]
                        : [],
                highAssumptions: resource.high_usage_assumptions_and_analysis
                    ? [resource.high_usage_assumptions_and_analysis]
                    : [],
            })
        })
    } catch (e) {
        console.error(`Failed to parse analysis: `, e)
    }

    let report = `## Cost Estimation

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

**Resource Details**:
${resourceDetails
    .map(
        (resource) => `
#### ${resource.resource_name}

**Notes**:
${
    resource.notes.length > 0
        ? resource.notes.map((note) => `- ${note}`).join("\n")
        : "- No additional notes."
}

**Assumptions**:
- **Low Usage**:
  ${
      resource.lowAssumptions.length > 0
          ? resource.lowAssumptions
                .map((assumption) => `- ${assumption}`)
                .join("\n")
          : "- No low usage assumptions provided."
  }
- **Average Usage**:
  ${
      resource.averageAssumptions.length > 0
          ? resource.averageAssumptions
                .map((assumption) => `- ${assumption}`)
                .join("\n")
          : "- No average usage assumptions provided."
  }
- **High Usage**:
  ${
      resource.highAssumptions.length > 0
          ? resource.highAssumptions
                .map((assumption) => `- ${assumption}`)
                .join("\n")
          : "- No high usage assumptions provided."
  }
`
    )
    .join("\n")}

**Disclaimer**: ⚠️  
These cost estimates are indicative only. Actual costs may vary due to regional pricing differences, varying usage patterns, and changes in AWS pricing. This tool is designed to provide a general guideline for the cost impact of IaC changes and should not be used as the sole basis for financial or operational decisions.`

    return report
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
    owner: string,
    repo: string,
    prNumber: number,
    iacStack: string,
    iacDir: string,
    model: string,
    modelBaseUrl: string
) {
    try {
        const octokit = getOctokit(githubToken)

        let analysis: string = ""
        for (const estimator of estimators) {
            if (estimator.getIaCType() === iacStack) {
                analysis = await estimator.analyze(
                    iacDir ?? "",
                    new MscService(
                        openaiApiKey,
                        model ?? "",
                        modelBaseUrl ?? ""
                    )
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
