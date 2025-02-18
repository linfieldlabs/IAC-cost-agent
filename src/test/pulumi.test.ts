import { PulumiEstimator } from "../estimators/pulumiEstimator"
import dotenv from "dotenv"
import path from "path"
import { GPT4Service } from "../services/gpt4Service"
import { LLama3Service } from "../services/llama3Service"
import {
    EstimatorResponse,
    generateCostReport,
    generateCostTable,
} from "../main"

dotenv.config({ path: path.join(__dirname, "../.env") })

describe("Pulumi Estimator Tests", () => {
    const openaiApiKey = process.env.OPENAI_API_KEY
    const testPulumiDir = path.join(__dirname, "pulumi")

    if (!openaiApiKey) {
        console.error(
            "OPENAI_API_KEY is not found. Please set it in the .env file."
        )
        process.exit(1)
    }

    beforeAll(() => {
        if (!openaiApiKey) {
            console.error(
                "OPENAI_API_KEY is not found. Please set it in the .env file."
            )
            process.exit(1)
        }
    })

    it("should analyze a Pulumi preview", async () => {
        const estimator = new PulumiEstimator()
        const analyses = await estimator.analyze(
            testPulumiDir,
            new LLama3Service(openaiApiKey)
        )

        console.log(analyses)

        const result: EstimatorResponse = JSON.parse(analyses)

        expect(result).toHaveProperty("analysis_note")
        expect(result).toHaveProperty("resources_names")
        expect(result).toHaveProperty("resources")
        expect(Array.isArray(result.resources)).toBe(true)

        result.resources.forEach((resource) => {
            expect(resource).toHaveProperty("resource_name")
            expect(resource).toHaveProperty("resource_type")
            expect(resource).toHaveProperty("change_to_resource")
            expect(resource).toHaveProperty("base_cost_analysis")
            expect(resource).toHaveProperty("base_cost")
            expect(resource).toHaveProperty(
                "average_usage_assumptions_and_analysis"
            )
            expect(resource).toHaveProperty("average_usage_cost")
            expect(resource).toHaveProperty(
                "high_usage_assumptions_and_analysis"
            )
            expect(resource).toHaveProperty("high_usage_cost")
            expect(resource).toHaveProperty(
                "low_usage_assumptions_and_analysis"
            )
            expect(resource).toHaveProperty("low_usage_cost")
            expect(resource).toHaveProperty("notes")
            expect(Array.isArray(resource.notes)).toBe(true)
        })

        console.log(analyses)

        const costResult = generateCostReport(analyses)
        console.log(costResult)
    }, 1000000)
})
