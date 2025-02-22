import { BaseLLMService } from "../services/baseLLMService"

export abstract class BaseEstimator {
    constructor() {}

    abstract findDirectories(): Promise<string[]>
    abstract generatePreview(directory: string): Promise<string>

    async analyze(iacDir: string, llmService: BaseLLMService): Promise<string> {
        if (!iacDir) {
            let directories = await this.findDirectories()
            if (directories.length === 0) {
                throw new Error("No directories found")
            }
            iacDir = directories[0]
        }

        try {
            const previewContent = await this.generatePreview(iacDir)
            let response = await llmService.getResponse(
                previewContent,
                this.getIaCType()
            )
            // remove ```json and ``` (code block response from LLM)
            response = response
                .replace(/^```json\s*/, "")
                .replace(/```$/, "")
                .replace(/^```\s*/, "")
            return response
        } catch (error) {
            throw new Error(`Failed to analyze preview: ${error}`)
        }
    }

    abstract getIaCType(): string
}
