import { OpenAIService } from "../services/openai-service"
import * as fs from "fs"
import * as path from "path"
import { generateCostReport } from "../scripts/terraform-estimator"
import * as dotenv from "dotenv"
import { exec } from "child_process"
import { promisify } from "util"

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

    // Generate and analyze Terraform plan
    const testDataDir = path.join(__dirname, "data")
    console.log("Test data directory:", testDataDir)

    // Initialize and generate plan
    await exec(`terraform init`, { cwd: testDataDir })
    await exec(`terraform plan -out=tfplan`, { cwd: testDataDir })

    // Convert plan to JSON
    let planContent = ""
    const execPromise = promisify(exec)
    const { stdout } = await execPromise(`terraform show -json tfplan`, {
        cwd: testDataDir,
        encoding: "utf8",
    })
    planContent = stdout

    // Analyze the plan
    const analysis = await openaiService.analyzeTerraformPlan(planContent)
    console.log("Response:", analysis)

    // Generate the report
    const report = generateCostReport([testDataDir], [analysis])
    console.log("\nGenerated Cost Report:")
    console.log(report)

    // Clean up
    fs.unlinkSync(path.join(testDataDir, "tfplan"))
}

runLocalTest().catch(console.error)
