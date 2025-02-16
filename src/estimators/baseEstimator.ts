import { BaseLLMService } from "../services/baseLLMService"

export abstract class BaseEstimator {
    constructor() {}

    abstract findDirectories(): Promise<string[]>
    abstract generatePreview(directory: string): Promise<string>

    async analyze(
        previewContent: string,
        llmService: BaseLLMService
    ): Promise<string> {
        try {
            return await llmService.getResponse(
                previewContent,
                this.getIaCType()
            )
        } catch (error) {
            throw new Error(`Failed to analyze preview: ${error}`)
        }
    }

    abstract getIaCType(): string
}
