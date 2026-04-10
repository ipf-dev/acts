# Deploy Guide

## Context

This runbook tracks the current AWS deployment assumptions for `acts`.

## Target Surfaces

- `apps/backend` + `apps/frontend` packaged into one web runtime
- `infra/aws/video-preview-lambda`

## Current Runtime Notes

- deploy region target: `ap-northeast-2` (`Seoul`)
- web runtime target: `Elastic Beanstalk`
- frontend delivery model: same-origin static frontend + backend API from one web service
- first rollout shape: one containerized web service with one running instance
- web runtime delivery artifact: GitHub Actions builds a Docker image, pushes it to Amazon ECR, and uploads a `Dockerrun.aws.json` bundle to Elastic Beanstalk
- video preview worker: `AWS Lambda` using `container image` package type from `ECR`
- asset storage: `S3`
- relational data: managed PostgreSQL cluster

## Current Decision

- `App Runner` is ruled out because the target deploy region is `ap-northeast-2` (`Seoul`)
- `Elastic Beanstalk` is selected for the fastest first deployment path in Seoul
- recommended platform branch: single-container `Docker` environment

## First Deploy Order

1. Create the production PostgreSQL cluster and writer endpoint credentials.
2. Create the production S3 asset bucket.
3. Create the private Amazon ECR repository for the web image in each target AWS account.
4. Create the Elastic Beanstalk application and a Docker web server environment in `ap-northeast-2`.
5. Attach `AmazonEC2ContainerRegistryReadOnly` or equivalent ECR pull permissions to the Elastic Beanstalk EC2 instance profile.
6. Configure GitHub Actions AWS roles plus `EB_*` and `ECR_WEB_REPOSITORY` variables.
7. Let GitHub Actions build and push the web image, then upload the generated `Dockerrun.aws.json` bundle as the application version.
8. Configure environment variables and secrets for database, auth, storage, and preview dispatch.
9. Attach private networking only if the database is private.
10. Manually bootstrap the production organization catalog and user accounts outside Flyway.
11. Deploy the video preview Lambda image and connect its function name to the web service.
12. Smoke test health, Google login, asset upload, download, preview, and admin pages.
13. Add a custom domain after the default service URL is working.

## Required App Configuration

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `BACKEND_BASE_URL`
- `FRONTEND_BASE_URL`
- `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID`
- `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET`
- `ACTS_PREVIEW_VIDEO_THUMBNAIL_LAMBDA_FUNCTION_NAME`

## Required GitHub Actions Configuration

- repository variable: `EB_APPLICATION_NAME`
- repository variable: `EB_STAGE_ENVIRONMENT`
- repository variable: `EB_PROD_ENVIRONMENT`
- repository variable: `EB_S3_BUCKET`
- repository variable: `ECR_WEB_REPOSITORY`
- repository secret: `AWS_ROLE_ARN_STAGE`
- repository secret: `AWS_ROLE_ARN_PROD`

## Stage Profile Notes

- set `SPRING_PROFILES_ACTIVE=stage` on the stage Elastic Beanstalk environment
- set `ACTS_STORAGE_BUCKET` to a stage-only S3 bucket so stage uploads do not land in the prod bucket
- set stage-specific values for `SPRING_DATASOURCE_*`, `BACKEND_BASE_URL`, and `FRONTEND_BASE_URL`
- `ACTS_PREVIEW_VIDEO_THUMBNAIL_LAMBDA_FUNCTION_NAME` is optional in stage; if left blank, video preview dispatch is skipped
- ensure the stage Beanstalk EC2 instance profile can pull from the stage account's `ECR_WEB_REPOSITORY`

## GitHub Actions Release Flow

- pushing to the `stage` branch builds the web image, pushes it to Amazon ECR, and deploys the generated `Dockerrun.aws.json` bundle to the stage Elastic Beanstalk environment
- pushing a Git tag that matches `v*` builds the tagged web image, pushes it to Amazon ECR, and deploys the generated `Dockerrun.aws.json` bundle to the prod Elastic Beanstalk environment
- prod tags must be created from the exact commit that finished stage verification so prod receives the reviewed release candidate
- if release-only fixes are needed, create a `release/vX.Y.Z` branch from the validated stage commit, make the final fixes there, then tag that final commit

## Release Commands

Tag the currently checked out validated commit directly:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Create a release branch from a validated stage commit first:

```bash
git checkout stage
git pull origin stage
git checkout -b release/v1.0.1 <validated-stage-commit-sha>

# optional final release-only fixes

git tag v1.0.1
git push origin release/v1.0.1
git push origin v1.0.1
```

## Runtime Notes

- keep the first rollout public and HTTPS-enabled so Google OAuth redirect setup stays simple
- keep the first rollout at one running instance because the current app uses server-side login sessions
- store database credentials and OAuth secrets in Secrets Manager or SSM Parameter Store references
- bootstrap user and organization reference data outside Flyway because real operational data is not stored in this repository
- the web container must expose one HTTP port and listen on the configured application port
- GitHub Actions uses the repository root `Dockerfile` to build the web image and publish it to ECR
- Elastic Beanstalk receives a zip bundle that contains only a generated `Dockerrun.aws.json` file pointing at the prebuilt image
- set the environment health check path to `/api/health`

## Release Checklist

1. Confirm `docs/BRIEF.md` still matches shipped scope.
2. Confirm environment variables and secrets are documented.
3. Confirm build and smoke checks pass.
4. Confirm stage verification finished on the exact commit that will receive the release tag.
5. Confirm the Elastic Beanstalk environment is running the intended application version.
6. Confirm the prod deployment was triggered by the intended `vX.Y.Z` tag.
7. Confirm rollback procedure is written here before team use.
8. Confirm the web image tag in ECR matches the intended release label or commit SHA.
9. Confirm the target Lambda function points at the intended ECR image tag or digest.
