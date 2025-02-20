# Cost Estimation for a Video Processing Pipeline on AWS

## Overview

This case study evaluates the cost estimation of a **video processing pipeline** deployed on AWS using Terraform. The architecture includes **fixed-cost components** (EC2, RDS, EIP) and **variable-cost components** (S3, Lambda, CloudWatch). The goal was to assess cost fluctuations based on usage patterns and validate the accuracy of an automated cost estimation tool.

## Architecture Components

• **Compute**: EC2 g4dn.xlarge for video transcoding (fixed cost).

• **Storage**: S3 bucket for video files (variable cost).

• **Database**: RDS db.t3.micro for metadata storage (fixed cost).

• **Networking**: Elastic IP (fixed cost).

• **Event-driven Processing**: AWS Lambda for metadata extraction (variable cost).

• **Monitoring**: CloudWatch for logging (variable cost).

## Cost Analysis

**Quick Summary**:
- **Base Cost**: $214.81

- **Variable Cost**:
  - **Low Usage**: $31.45
  - **Medium Usage**: $62.90
  - **High Usage**: $125.80

**Service Changes**:
- Created: aws_cloudwatch_log_group.lambda_logs
- Created: aws_db_instance.video_db
- Created: aws_eip.video_processor_ip
- Created: aws_iam_role.lambda_exec
- Created: aws_instance.video_processor
- Created: aws_lambda_function.video_metadata_extractor
- Created: aws_s3_bucket.video_bucket
- Created: aws_s3_bucket_lifecycle_configuration.video_storage_lifecycle

### Cost Summary
| **Service** | **Base Cost** | **Low Usage** | **Medium Usage** | **High Usage** |
| --- | --- | --- | --- | --- |
| aws_cloudwatch_log_group.lambda_logs | $0.00 | $0.50 | $1.00 | $2.00 |
| aws_db_instance.video_db | $13.04 | $0.00 | $0.00 | $0.00 |
| aws_eip.video_processor_ip | $3.60 | $0.00 | $0.00 | $0.00 |
| aws_iam_role.lambda_exec | $0.00 | $0.00 | $0.00 | $0.00 |
| aws_instance.video_processor | $198.17 | $0.00 | $0.00 | $0.00 |
| aws_lambda_function.video_metadata_extractor | $0.00 | $30.00 | $60.00 | $120.00 |
| aws_s3_bucket.video_bucket | $0.00 | $0.95 | $1.90 | $3.80 |
| aws_s3_bucket_lifecycle_configuration.video_storage_lifecycle | $0.00 | $0.00 | $0.00 | $0.00 |

**Assumptions**:
- **Low Usage**: - EC2 instance runs 24/7
- EIP is attached to the running instance
- RDS instance runs 24/7
- Lambda function is invoked 1M times
- S3 stores 1TB of data
- **Medium Usage**: - EC2 instance runs 24/7
- EIP is attached to the running instance
- RDS instance runs 24/7
- Lambda function is invoked 2M times
- S3 stores 2TB of data
- **High Usage**: - EC2 instance runs 24/7
- EIP is attached to the running instance
- RDS instance runs 24/7
- Lambda function is invoked 4M times
- S3 stores 4TB of data

**Notes**:
- EC2 instance (g4dn.xlarge) with $0.71 per hour, 24 hours a day, 30 days a month = $513.6 per month
- EIP costs $0.005 per hour when not attached to a running instance, 24 hours a day, 30 days a month = $3.6 per month
- RDS (db.t3.micro) with $0.017 per hour, 24 hours a day, 30 days a month = $12.24 per month
- Lambda function with 1M requests = $0.2, and 256MB memory size, running for 200ms, 1M times = $1.28, Total = $1.48 per month (low usage scenario)
- Lambda function with 1M requests = $0.2, and 256MB memory size, running for 200ms, 2M times = $2.56, Total = $2.76 per month (medium usage scenario)
- Lambda function with 1M requests = $0.2, and 256MB memory size, running for 200ms, 4M times = $5.12, Total = $5.32 per month (high usage scenario)
- S3 storage costs $0.023 per GB for the first 50TB for the Standard storage class. Assuming 1TB of storage = $23.55 per month (low usage scenario)
- S3 storage costs $0.023 per GB for the first 50TB for the Standard storage class. Assuming 2TB of storage = $47.1 per month (medium usage scenario)
- S3 storage costs $0.023 per GB for the first 50TB for the Standard storage class. Assuming 4TB of storage = $94.2 per month (high usage scenario)

**Disclaimer**: ⚠️  
These cost estimates are indicative only. Actual costs may vary due to regional pricing differences, varying usage patterns, and changes in AWS pricing. This tool is designed to provide a general guideline for the cost impact of IaC changes and should not be used as the sole basis for financial or operational decisions.
  

**Conclusion**
 - Sometimes the pricing isn’t accurate, which makes sense since we’re using an LLM for the data.
- The reasoning notes don’t always match the results in the table.
- Instead of trying to get everything in one go, we should take a step-by-step approach to figure things out.
