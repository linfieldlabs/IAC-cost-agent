provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe01e" # Replace with a valid AMI ID
  instance_type = "t2.micro"

  tags = {
    Name = "ExampleInstance"
  }
}

output "instance_id" {
  value = aws_instance.example.id
}