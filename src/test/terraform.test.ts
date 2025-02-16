import { TerraformEstimator } from "../estimators/terraformEstimator"
import dotenv from "dotenv"
import path from "path"
import { GPT4Service } from "../services/gpt4Service"
import { LLama3Service } from "../services/llama3Service"

dotenv.config({ path: path.join(__dirname, "../.env") })

describe("Terraform Estimator Tests", () => {
    const openaiApiKey = process.env.OPENAI_API_KEY
    const testTerraformDir = path.join(__dirname, "terraform")
    const aws_access_key_id = process.env.AWS_ACCESS_KEY_ID
    const aws_secret_access_key = process.env.AWS_SECRET_ACCESS_KEY

    beforeAll(() => {
        if (!openaiApiKey) {
            console.error(
                "OPENAI_API_KEY is not found. Please set it in the .env file."
            )
            process.exit(1)
        }

        if (!aws_access_key_id || !aws_secret_access_key) {
            console.error(
                "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are not found. Please set them in the .env file."
            )
            process.exit(1)
        }

        const exec = require("child_process").exec

        exec("export AWS_ACCESS_KEY_ID=${aws_access_key_id}")
        exec("export AWS_SECRET_ACCESS_KEY=${aws_secret_access_key}")
    })

    it("should analyze a Terraform plan", async () => {
        const estimator = new TerraformEstimator()
        const analyses = await estimator.analyze(
            testTerraformDir,
            new LLama3Service(openaiApiKey!)
        )

        const result = JSON.parse(analyses)

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
