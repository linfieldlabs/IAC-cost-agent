// services/llm/openai-service.ts
import OpenAI from "openai"
import { BaseLLMService } from "./baseLLMService"
import { getPrompt } from "./utils"

export class GPT4Service extends BaseLLMService {
    private openai: OpenAI

    constructor(apiKey: string) {
        super(apiKey, "gpt-4")
        this.openai = new OpenAI({ apiKey: this.apiKey })
    }

    protected initializePrompts(): void {
        this.prompts.set("terraform", {
            prompt: getPrompt("Terraform"),
            responseFormat: "{ baseCost: number, variableCosts: {...} }",
        })
        this.prompts.set("pulumi", {
            prompt: getPrompt("Pulumi"),
            responseFormat: "{ baseCost: number, variableCosts: {...} }",
        })
    }

    async getResponse(content: string, iacType: string): Promise<string> {
        const { prompt } = this.getPrompt(iacType)

        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content:
                            "You're an assistant that only speaks JSON. Do not write normal text.",
                    },
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
