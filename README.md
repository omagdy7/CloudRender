# CloudRender Project

## Overview

CloudRender is a distributed image processing system that leverages cloud computing resources to efficiently process large volumes of images. The project uses Terraform for Infrastructure as Code (IaC) and Kubernetes for container orchestration, ensuring scalability and fault tolerance. The system comprises several components, including an application server, worker nodes, a load balancer, Kubernetes, Terraform, Amazon S3, and RabbitMQ, working together to provide a robust, scalable, and efficient image processing service.

## Project Structure

1. **Application Server:** Manages incoming image processing requests and communicates with worker nodes.
2. **Worker Nodes:** Perform the actual image processing tasks.
3. **Load Balancer:** Distributes incoming requests evenly across worker nodes.
4. **Kubernetes:** Orchestrates the containerized applications, including deployment, scaling, and management.
5. **Terraform:** Manages the setup of the project's underlying infrastructure.
6. **Amazon S3:** Stores the original and processed images.
7. **RabbitMQ:** Acts as the message broker, managing the task queues between the application server and worker nodes.

## Prerequisites

- AWS account
- Terraform installed
- Kubernetes installed
- Docker installed
- AWS CLI configured

## Installation and Setup

### 1. Clone the Repository

```sh
git clone https://github.com/omagdy7/CloudRender
cd CloudRender
```

### 2. Clone the infra Repository
git clone https://github.com/omagdy7/CloudRender-Infra

### 3. Set Up Infrastructure with Terraform
Navigate to the terraform directory and initialize Terraform.

```sh
cd CloudRender-Infra/terraform
terraform init
```
Apply the Terraform configuration to set up the infrastructure.

```sh

terraform apply
```

### 4. Build Docker Images
Build the Docker images for the application server and worker nodes.

```sh
docker build -t cloudrender-app ./app
docker build -t cloudrender-worker ./worker
```

### 5. Push Docker Images to AWS ECR
Tag and push the Docker images to your AWS Elastic Container Registry (ECR).

```sh
# Tag the images
docker tag cloudrender-app:latest <aws-account-id>.dkr.ecr.<region>.amazonaws.com/cloudrender-app:latest
docker tag cloudrender-worker:latest <aws-account-id>.dkr.ecr.<region>.amazonaws.com/cloudrender-worker:latest
# Push the images
docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/cloudrender-app:latest
docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/cloudrender-worker:latest
```

### 6. Deploy to Kubernetes
Navigate to the k8s directory and apply the Kubernetes configurations.
```sh
cd CloudRender-Infra/kubernetes
kubectl apply -f app-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f auto-hpa.yaml
```

## Usage
- Upload images to be processed by sending requests to the application server.
- The application server stores the images in Amazon S3 and sends task notifications to RabbitMQ.
- Worker nodes retrieve tasks from RabbitMQ, fetch images from S3, process them, and store the results back in S3.
- The load balancer distributes incoming requests to ensure no single node is overwhelmed.
