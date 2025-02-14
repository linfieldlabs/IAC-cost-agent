import runPulumiEstimator from "../scripts/pulumi-estimator"
import dotenv from "dotenv"
import path from "path"

dotenv.config()

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
        const analyses = await runPulumiEstimator(testPulumiDir, openaiApiKey)

        expect(analyses).toBeInstanceOf(Array)
        expect(analyses.length).toBeGreaterThan(0)

        const result = JSON.parse(analyses[0])

        expect(result).toHaveProperty("baseCost")
        expect(result).toHaveProperty("variableCosts")
        expect(result.variableCosts).toEqual(
            expect.objectContaining({
                low: expect.any(Number),
                medium: expect.any(Number),
                high: expect.any(Number),
            })
        )
        expect(result).toHaveProperty("serviceChanges")
        expect(result).toHaveProperty("detailedCosts")
        expect(result).toHaveProperty("notes")
        expect(result).toHaveProperty("low_assumptions")
        expect(result).toHaveProperty("medium_assumptions")
        expect(result).toHaveProperty("high_assumptions")

        expect(result.detailedCosts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    resourceName: expect.any(String),
                    resourceType: expect.any(String),
                    baseCostEstimate: expect.any(Number),
                    variableCostEstimate: expect.objectContaining({
                        low: expect.any(Number),
                        medium: expect.any(Number),
                        high: expect.any(Number),
                    }),
                }),
            ])
        )
    }, 1000000)
})
