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
