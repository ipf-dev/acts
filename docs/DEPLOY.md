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
3. Add the web `Dockerfile` and deployable source bundle structure at the repository root.
4. Create the Elastic Beanstalk application and a Docker web server environment in `ap-northeast-2`.
5. Upload the source bundle so Elastic Beanstalk builds and runs the web container.
6. Configure environment variables and secrets for database, auth, storage, and preview dispatch.
7. Attach private networking only if the database is private.
8. Manually bootstrap the production organization catalog and user accounts outside Flyway.
9. Deploy the video preview Lambda image and connect its function name to the web service.
10. Smoke test health, Google login, asset upload, download, preview, and admin pages.
11. Add a custom domain after the default service URL is working.

## Required App Configuration

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `BACKEND_BASE_URL`
- `FRONTEND_BASE_URL`
- `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID`
- `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET`
- `ACTS_PREVIEW_VIDEO_THUMBNAIL_LAMBDA_FUNCTION_NAME`

## Runtime Notes

- keep the first rollout public and HTTPS-enabled so Google OAuth redirect setup stays simple
- keep the first rollout at one running instance because the current app uses server-side login sessions
- store database credentials and OAuth secrets in Secrets Manager or SSM Parameter Store references
- bootstrap user and organization reference data outside Flyway because real operational data is not stored in this repository
- the web container must expose one HTTP port and listen on the configured application port
- for the fastest first rollout, let Elastic Beanstalk build the image from the repository `Dockerfile`
- set the environment health check path to `/api/health`

## Release Checklist

1. Confirm `docs/BRIEF.md` still matches shipped scope.
2. Confirm environment variables and secrets are documented.
3. Confirm build and smoke checks pass.
4. Confirm the Elastic Beanstalk environment is running the intended application version.
5. Confirm rollback procedure is written here before team use.
6. Confirm the target Lambda function points at the intended ECR image tag or digest.
