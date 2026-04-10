# Infrastructure

## Local Development

Use `infra/docker-compose.yml` for the default local stack.

## Current Structure

- local
  - `infra/docker-compose.yml`
  - PostgreSQL
  - LocalStack S3
- AWS runtime
  - web app: `Elastic Beanstalk`
  - runtime package: single web service for same-origin frontend + backend delivery, deployed from a prebuilt Amazon ECR image
  - relational database: `PostgreSQL cluster` on managed AWS database service
  - asset storage: `S3`
  - video preview worker: `Lambda`
  - image registry: `ECR` for the web app image and Lambda worker images

## Web App Runtime

- deploy region target: `ap-northeast-2` (`Seoul`)
- deploy target: a single containerized web service on `Elastic Beanstalk`
- reason: keep Google SSO, session flow, and frontend `/api` calls on one origin
- CI/CD: GitHub Actions builds the web Docker image, pushes it to ECR, and uploads a minimal `Dockerrun.aws.json` bundle to Elastic Beanstalk
- App Runner is excluded because Seoul region support is unavailable
- selected Beanstalk shape: single-container Docker environment
- recommended first rollout: public HTTPS endpoint, single running instance, custom domain added after the first successful deploy
- network: attach private networking only when the database is placed in private subnets
- user and organization bootstrap data is applied outside the repository after schema migration

## Preview Worker

- source path: `infra/aws/video-preview-lambda`
- package type: `Container image`
- input: backend async invoke payload with `bucket`, `objectKey`, `previewObjectKey`, `originalFileName`
- output: `${objectKey}.preview.jpg` written to the asset bucket
- IAM: Lambda execution role needs S3 read/write and CloudWatch Logs write

## Fill In Later

- cloud account and region
- managed database choice and subnet plan
- custom domain
- secret sources
