import { OpenAIService } from "../services/openai-service"
import * as fs from "fs"
import * as path from "path"
import { generateCostReport } from "../scripts/terraform-estimator"
import * as dotenv from "dotenv"

async function runLocalTest() {
    dotenv.config()

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
        console.error(
            "OPENAI_API_KEY is not found. Please set it in the .env file."
        )
        process.exit(1)
    }

    const openaiService = new OpenAIService(openaiApiKey)

    // Read test Terraform files
    const testDataDir = path.join(__dirname, "data")
    const files = fs
        .readdirSync(testDataDir)
        .filter((file) => file.endsWith(".tf"))

    console.log("Analyzing Terraform files:", files)

    const analyses = await Promise.all(
        files.map(async (file) => {
            const filePath = path.join(testDataDir, file)
            const content = fs.readFileSync(filePath, "utf-8")
            const response = await openaiService.analyzeTerraformConfig(content)
            console.log("Response:", response)
            return response
        })
    )

    // Generate the report
    const report = generateCostReport(files, analyses)
    console.log("\nGenerated Cost Report:")
    console.log(report)
}

runLocalTest().catch(console.error)
