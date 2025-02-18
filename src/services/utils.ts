export function getPrompt(iacType: string) {
    return `
    Analyze the following ${iacType} preview JSON output and provide a cost estimation report based on your knowledge of common AWS/Azuere (or other relevent provider) pricing. The report should meet these requirements:

1. Examine the planned changes in the ${iacType} preview JSON.
2. Identify all resources that will be added, modified, or deleted.
3. Provide estimated costs by making reasonable assumptions based on general knowledge of AWS/Azure (or other relevent provider) pricing. If exact prices are unknown, provide an estimated guess.
4. Calculate estimated costs for:
   - Base Cost (fixed monthly charges)
   - Variable Cost scenarios based on the resource type. Define appropriate usage tiers for each resource:
     * Low Usage (minimal expected usage)
     * Medium Usage (moderate expected usage)
     * High Usage (heavy expected usage)
5. If a cost estimation is not possible, return a JSON with null values for the fields instead of omitting them.

Format the response as a structured JSON with the following fields:
 {
    "analysis_note": string, // descriptive analysis and your thought process in approaching the problem
    "resources_names": string[],
    "resources": {
            "resource_name": string,
            "resource_type": string,
            change_to_resource: string // change to the resource, e.g. "create", "update", "increase memory" etc
            "base_cost_analysis": string, // thought process and cost breakdown
            "base_cost": number,
            "average_usage_assumptions_and_analysis": string, // assumptions and analysis for average usage including cost breakdown
            "average_usage_cost": number,
            "high_usage_assumptions_and_analysis": string, // assumptions and analysis for high usage including cost breakdown
            "high_usage_cost": number,
            "low_usage_assumptions_and_analysis": string, // assumptions and analysis for low usage including cost breakdown
            "low_usage_cost": number,
            "notes": string[], // notes about the cost estimation. 
    }[]
}

Do not include any other text or comments in your response. Response should be json only.

Here's the ${iacType} preview JSON:
    `
}
