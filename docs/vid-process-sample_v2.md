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

## Cost Estimation

**Quick Summary**:

-   **Base Cost**: $393.84

-   **Variable Cost**:
    -   **Low Usage**: $394.16
    -   **Average Usage**: $413.04
    -   **High Usage**: $507.64

**Service Changes**:

-   lambda_logs -> create (aws_cloudwatch_log_group)
-   video_db -> create (aws_db_instance)
-   video_processor_ip -> create (aws_eip)
-   lambda_exec -> create (aws_iam_role)
-   video_processor -> create (aws_instance)
-   video_metadata_extractor -> create (aws_lambda_function)
-   video_bucket -> create (aws_s3_bucket)
-   video_storage_lifecycle -> create (aws_s3_bucket_lifecycle_configuration)

### Cost Summary

| **Service**              | **Base Cost** | **Low Usage** | **Average Usage** | **High Usage** |
| ------------------------ | ------------- | ------------- | ----------------- | -------------- |
| lambda_logs              | $0.00         | $0.05         | $0.50             | $5.00          |
| video_db                 | $12.24        | $12.24        | $17.24            | $32.24         |
| video_processor_ip       | $0.00         | $0.00         | $0.00             | $1.80          |
| lambda_exec              | $0.00         | $0.00         | $0.00             | $0.00          |
| video_processor          | $381.60       | $381.60       | $391.60           | $431.60        |
| video_metadata_extractor | $0.00         | $0.00         | $1.00             | $10.00         |
| video_bucket             | $0.00         | $0.23         | $2.30             | $23.00         |
| video_storage_lifecycle  | $0.00         | $0.04         | $0.40             | $4.00          |

**Resource Details**:

#### lambda_logs

**Notes**:

-   The cost highly depends on the amount of log data.

**Assumptions**:

-   **Low Usage**:
    -   Assuming low logging 0.1GB per month, the cost would be $0.05.
-   **Average Usage**:
    -   Assuming moderate logging 1GB per month, the cost would be $0.50.
-   **High Usage**:
    -   Assuming high logging 10GB per month, the cost would be $5.

#### video_db

**Notes**:

-   The cost highly depends on the IO and backup storage.

**Assumptions**:

-   **Low Usage**:
    -   Assuming low IO and backup storage, additional cost would be minimal.
-   **Average Usage**:
    -   Assuming moderate IO and backup storage, additional cost would be around $5.
-   **High Usage**:
    -   Assuming high IO and backup storage, additional cost would be around $20.

#### video_processor_ip

**Notes**:

-   The cost highly depends on whether the EIP is attached to a running instance.

**Assumptions**:

-   **Low Usage**:
    -   Assuming the EIP is always attached, there would be no additional cost.
-   **Average Usage**:
    -   Assuming the EIP is occasionally not attached, the additional cost would be minimal.
-   **High Usage**:
    -   Assuming the EIP is not attached half of the time, the additional cost would be $1.8.

#### lambda_exec

**Notes**:

-   AWS IAM roles have no additional cost.

**Assumptions**:

-   **Low Usage**:
    -   As there's no cost associated with AWS IAM roles, the cost remains the same.
-   **Average Usage**:
    -   As there's no cost associated with AWS IAM roles, the cost remains the same.
-   **High Usage**:
    -   As there's no cost associated with AWS IAM roles, the cost remains the same.

#### video_processor

**Notes**:

-   The cost highly depends on the EBS and data transfer.

**Assumptions**:

-   **Low Usage**:
    -   Assuming low EBS and data transfer, additional cost would be minimal.
-   **Average Usage**:
    -   Assuming moderate EBS and data transfer, additional cost would be around $10.
-   **High Usage**:
    -   Assuming high EBS and data transfer, additional cost would be around $50.

#### video_metadata_extractor

**Notes**:

-   The cost highly depends on the execution time and memory usage.

**Assumptions**:

-   **Low Usage**:
    -   Assuming low execution time and memory usage, the cost would be minimal.
-   **Average Usage**:
    -   Assuming moderate execution time and memory usage, the cost would be around $1.
-   **High Usage**:
    -   Assuming high execution time and memory usage, the cost would be around $10.

#### video_bucket

**Notes**:

-   The cost highly depends on the storage used.

**Assumptions**:

-   **Low Usage**:
    -   Assuming low storage 10GB per month, the cost would be $0.23.
-   **Average Usage**:
    -   Assuming moderate storage 100GB per month, the cost would be $2.3.
-   **High Usage**:
    -   Assuming high storage 1000GB per month, the cost would be $23.

#### video_storage_lifecycle

**Notes**:

-   The cost highly depends on the storage transitioned.

**Assumptions**:

-   **Low Usage**:
    -   Assuming low storage transitioned 10GB per month, the cost would be $0.04.
-   **Average Usage**:
    -   Assuming moderate storage transitioned 100GB per month, the cost would be $0.4.
-   **High Usage**:
    -   Assuming high storage transitioned 1000GB per month, the cost would be $4.

**Disclaimer**: ⚠️  
These cost estimates are indicative only. Actual costs may vary due to regional pricing differences, varying usage patterns, and changes in AWS pricing. This tool is designed to provide a general guideline for the cost impact of IaC changes and should not be used as the sole basis for financial or operational decisions.
