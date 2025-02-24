# IaC Cost Estimator GitHub Action

An AI-powered GitHub Action that automatically calculates and provides cost estimates for infrastructure changes in your Pull Requests.

## Quick Start

1. Add the action to your workflow:

```yaml
name: IaC Cost Estimation

on:
    pull_request:
        types: [opened, synchronize, reopened]

jobs:
    estimate-cost:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: linfieldlabs/iac-cost-estimator@v1
              with:
                  iac-stack: "terraform" # Required: terraform or pulumi
                  iac-dir: "infrastructure" # Optional: defaults to root directory
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
                  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
                  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
                  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

2. Configure required secrets in your repository settings:

### Required Environment Variables

| Name                    | Description                                 |
| ----------------------- | ------------------------------------------- |
| `OPENAI_API_KEY`        | Your OpenAI API key (or any compatible API) |
| `AWS_ACCESS_KEY_ID`     | AWS access key for IaC operations           |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for IaC operations           |
| `GITHUB_TOKEN`          | GitHub token for PR comments                |

### Action Inputs

| Name             | Required | Default     | Description                            |
| ---------------- | -------- | ----------- | -------------------------------------- |
| `iac-stack`      | Yes      | `terraform` | IaC platform (`terraform` or `pulumi`) |
| `iac-dir`        | No       | `""`        | Directory containing IaC files         |
| `model`          | No       | `gpt-4`     | LLM model to use                       |
| `model_base_url` | No       | `""`        | Custom model API endpoint              |

## Features

-   🔄 Automatic cost analysis on PR changes
-   💰 Detailed cost breakdowns
-   📊 Usage-based scenarios (Low, Medium, High)
-   🏗️ Supports Terraform and Pulumi
-   🤖 AI-powered estimation
-   📝 Comprehensive PR comments

## Supported IaC Platforms

-   ✅ Terraform
-   ✅ Pulumi

## Example Output

The action generates detailed PR comments including:

-   Base cost estimates
-   Variable cost scenarios
-   Service-by-service breakdown
-   Change summaries
-   Usage assumptions
-   Cost impact disclaimers

[View Example PR Comment TODO](link-to-example-pr)

## Local Development

### Prerequisites

-   Node.js v20 or later
-   npm
-   Terraform CLI (for Terraform support)
-   Pulumi CLI (for Pulumi support)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/iac-cost-estimator.git
cd iac-cost-estimator
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Create a .env file in the `src` directory. (Copy from .env.sample)

```bash
OPENAI_API_KEY=your_openai_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

4. Build the project:

```bash
npm run build
```

5. Run tests:

```bash
npm test
```

## Project Structure

```
├── src/
│ ├── estimators/ # IaC-specific cost estimators
│ ├── services/ # LLM service implementations
│ └── test/ # Test files and fixtures
├── .github/
│ └── workflows/ # GitHub Action workflows
└── dist/ # Compiled JavaScript
```

### Key Components

-   **Estimators**: Handle IaC-specific operations (plan/preview generation)
-   **LLM Services**: Interface with AI models for cost analysis
-   **Core Logic**: Processes and formats cost estimations

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines TODO](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the TODO - see the [LICENSE](LICENSE) file for details.

## Disclaimer

⚠️ Cost estimates provided by this tool are indicative only. Actual costs may vary due to regional pricing differences, usage patterns, and changes in cloud provider pricing. This tool should not be used as the sole basis for financial or operational decisions.
