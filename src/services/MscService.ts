// miscellaneous service

import OpenAI from "openai"
import { BaseLLMService } from "./baseLLMService"
import { getPrompt } from "./utils"

export class MscService extends BaseLLMService {
    protected baseUrl: string
    protected openai: OpenAI

    constructor(apiKey: string, model: string, baseUrl: string) {
        super(apiKey, model)
        this.baseUrl = baseUrl

        this.openai = new OpenAI({
            apiKey: this.apiKey,
            baseURL: this.baseUrl,
        })
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
                            "You're an assistant that only speaks JSON. Do not write normal text. Strictly start your response with { and end with }. Entire responses should be valid JSON.",
                    },
                    { role: "user", content: `${prompt}\n\n${content}` },
                ],
                temperature: 0.2,
                top_p: 0.1,
            })

            return response.choices[0].message.content || ""
        } catch (error) {
            throw new Error(`OpenAI API error: ${error}`)
        }
    }
}
