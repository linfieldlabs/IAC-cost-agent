import { TerraformEstimator } from "../estimators/terraformEstimator"
import dotenv from "dotenv"
import path from "path"
import { EstimatorResponse, generateCostReport } from "../main"
import { MscService } from "../services/MscService"

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
            new MscService(
                openaiApiKey!,
                "llama3-8b-8192",
                "https://api.groq.com/openai/v1"
            )
        )

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
