provider "aws" {
  region = "us-east-1"
}

# S3 Bucket for Video Storage (Variable Cost)
resource "aws_s3_bucket" "video_bucket" {
  bucket = "video-processing-storage"
  force_destroy = true
}

# EC2 Instance for Video Processing (Fixed Cost)
resource "aws_instance" "video_processor" {
  ami           = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
  instance_type = "g4dn.xlarge"  # GPU instance for video processing
  key_name      = "video-processing-key"
  
  root_block_device {
    volume_size = 50  # 50GB EBS storage (Fixed Cost)
  }

  tags = {
    Name = "VideoProcessorInstance"
  }
}

# EIP (Fixed Monthly Cost)
resource "aws_eip" "video_processor_ip" {
  instance = aws_instance.video_processor.id
}

# RDS Database for Metadata Storage (Fixed Cost)
resource "aws_db_instance" "video_db" {
  identifier        = "video-db"
  engine           = "mysql"
  instance_class   = "db.t3.micro"
  allocated_storage = 20  # 20GB storage
  username         = "admin"
  password         = "password123"
  skip_final_snapshot = true
}

# Lambda Function for Metadata Extraction (Variable Cost)
resource "aws_lambda_function" "video_metadata_extractor" {
  function_name = "video_metadata_extractor"
  runtime       = "python3.8"
  handler       = "lambda_function.lambda_handler"
  
  s3_bucket = aws_s3_bucket.video_bucket.id
  s3_key    = "lambda_code.zip"
  
  role = aws_iam_role.lambda_exec.arn
  
  memory_size = 256  # 256MB RAM (Variable Cost)
  timeout     = 10  # 10 seconds execution time
  
  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.video_bucket.id
      RDS_HOST  = aws_db_instance.video_db.endpoint
    }
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# CloudWatch Log Group for Lambda (Variable Cost)
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.video_metadata_extractor.function_name}"
  retention_in_days = 14
}

# S3 Lifecycle Rule to Move Processed Videos to Glacier (Variable Cost)
resource "aws_s3_bucket_lifecycle_configuration" "video_storage_lifecycle" {
  bucket = aws_s3_bucket.video_bucket.id

  rule {
    id     = "move-to-glacier"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }
  }
}

output "s3_bucket_name" {
  value = aws_s3_bucket.video_bucket.id
}

output "ec2_public_ip" {
  value = aws_eip.video_processor_ip.public_ip
}

output "rds_endpoint" {
  value = aws_db_instance.video_db.endpoint
}