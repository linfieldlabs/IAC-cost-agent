// services/llm/openai-service.ts
import OpenAI from "openai"
import { BaseLLMService } from "./baseLLMService"

export class GPT4Service extends BaseLLMService {
    private openai: OpenAI

    constructor(apiKey: string) {
        super(apiKey, "gpt-4")
        this.openai = new OpenAI({ apiKey: this.apiKey })
    }

    protected initializePrompts(): void {
        this.prompts.set("terraform", {
            prompt: `Analyze the following Terraform configuration and provide a cost estimation report...`,
            responseFormat: "{ baseCost: number, variableCosts: {...} }",
        })
        this.prompts.set("pulumi", {
            prompt: `Analyze the following Pulumi preview JSON output...`,
            responseFormat: "{ baseCost: number, variableCosts: {...} }",
        })
    }

    async getResponse(content: string, iacType: string): Promise<string> {
        const { prompt } = this.getPrompt(iacType)

        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "user", content: `${prompt}\n\n${content}` },
                ],
                temperature: 0.7,
            })

            return response.choices[0].message.content || ""
        } catch (error) {
            throw new Error(`OpenAI API error: ${error}`)
        }
    }
}
