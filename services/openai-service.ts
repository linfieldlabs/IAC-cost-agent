import OpenAI from "openai"

export class OpenAIService {
    private openai: OpenAI

    constructor(apiKey: string) {
        this.openai = new OpenAI({ apiKey })
    }

    async analyzeTerraformConfig(fileContent: string): Promise<string> {
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

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        })

        return response.choices[0].message.content || ""
    }
}
