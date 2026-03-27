# Infrastructure

## Local Development

Use `infra/docker-compose.yml` for the default local stack.

## Current Structure

- local
  - `infra/docker-compose.yml`
  - PostgreSQL
  - LocalStack S3
- AWS runtime
  - backend: `ECS`
  - asset storage: `S3`
  - video preview worker: `Lambda`
  - lambda image registry: `ECR`

## Preview Worker

- source path: `infra/aws/video-preview-lambda`
- package type: `Container image`
- input: backend async invoke payload with `bucket`, `objectKey`, `previewObjectKey`, `originalFileName`
- output: `${objectKey}.preview.jpg` written to the asset bucket
- IAM: Lambda execution role needs S3 read/write and CloudWatch Logs write

## Fill In Later

- cloud account and region
- network topology
- frontend hosting target
- secret sources
