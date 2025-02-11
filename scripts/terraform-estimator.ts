import { exec } from "@actions/exec"
import { getOctokit } from "@actions/github"
import * as core from "@actions/core"
import { OpenAIService } from "../services/openai-service"
import * as path from "path"
import * as fs from "fs"

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
    // Initialize terraform in the directory
    await exec("terraform", ["init"], { cwd: directory })

    // Generate plan and save it to a file
    await exec("terraform", ["plan", "-out=tfplan"], { cwd: directory })

    // Convert plan to JSON
    let planContent = ""
    await exec("terraform", ["show", "-json", "tfplan"], {
        cwd: directory,
        listeners: {
            stdout: (data: Buffer) => {
                planContent += data.toString()
            },
        },
    })

    // Clean up
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

export default async function run(
    githubToken: string,
    openaiApiKey: string,
    repo: string,
    owner: string,
    prNumber: number
) {
    try {
        const octokit = getOctokit(githubToken)
        const openaiService = new OpenAIService(openaiApiKey)

        const iacStack = core.getInput("iac-stack")
        const iacDir = core.getInput("iac-dir")

        if (iacStack !== "terraform") {
            throw new Error(
                `IaC stack '${iacStack}' is not yet implemented. Currently only 'terraform' is supported.`
            )
        }

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

        const validAnalyses = analyses.filter(
            (analysis): analysis is string => analysis !== null
        )
        const comment = generateCostReport(terraformDirs, validAnalyses)

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

export function generateCostReport(
    files: string[],
    analyses: string[]
): string {
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
            console.error(`Failed to parse analysis for ${files[index]}:`, e)
        }
    })

    return `## Terraform Cost Estimation

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

function generateCostTable(
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
        `$${cost.baseCostEstimate.toFixed(2)} (${formatDelta(
            cost.baseCostEstimate
        )})`,
        `$${cost.variableCostEstimate.low.toFixed(2)} (${formatDelta(
            cost.variableCostEstimate.low
        )})`,
        `$${cost.variableCostEstimate.medium.toFixed(2)} (${formatDelta(
            cost.variableCostEstimate.medium
        )})`,
        `$${cost.variableCostEstimate.high.toFixed(2)} (${formatDelta(
            cost.variableCostEstimate.high
        )})`,
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
