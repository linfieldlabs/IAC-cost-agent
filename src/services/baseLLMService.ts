export interface IaCPrompt {
    prompt: string
    responseFormat: string
}

export abstract class BaseLLMService {
    protected apiKey: string
    protected baseUrl?: string
    protected model: string
    protected prompts: Map<string, IaCPrompt>

    constructor(apiKey: string, model: string) {
        this.apiKey = apiKey
        this.model = model
        this.prompts = new Map()
        this.initializePrompts()
    }

    protected abstract initializePrompts(): void

    abstract getResponse(content: string, iacType: string): Promise<string>

    protected getPrompt(iacType: string): IaCPrompt {
        const prompt = this.prompts.get(iacType)
        if (!prompt) {
            throw new Error(`No prompt configured for IaC type: ${iacType}`)
        }
        return prompt
    }
}
