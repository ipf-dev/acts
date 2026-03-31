---
name: acts-aws-runtime-ops
description: Use for ACTS AWS deployment, production troubleshooting, Elastic Beanstalk, RDS, S3 direct upload, custom domain/SSL, and video preview Lambda tasks. Trigger when the user asks about prod deploys, Beanstalk settings, RDS access, S3 upload/download issues, Google OAuth production setup, or preview Lambda image rollout/debugging.
---

# ACTS AWS Runtime Ops

Use this skill for repo-specific AWS runtime work.

## Quick Start

1. Read [`references/current-runtime.md`](references/current-runtime.md).
2. For web app issues, inspect:
   - `apps/backend/src/main/resources/application-prod.yml`
   - `docs/DEPLOY.md`
   - `docs/INFRASTRUCTURE.md`
3. For preview issues, inspect:
   - `infra/aws/video-preview-lambda/handler.py`
   - `infra/aws/video-preview-lambda/Dockerfile`

## Working Rules

- Treat the web app and preview worker as separate deployables.
- Beanstalk source bundle changes do not update the preview Lambda.
- Preview Lambda image changes do not require Beanstalk redeploy.
- Prefer small, direct operational fixes and confirm whether the failure is in:
  - web app auth/session
  - RDS connectivity
  - S3 direct browser upload
  - preview Lambda invoke
  - preview Lambda S3 read/write

## Standard Triage

### Web app

- Check `/api/health` first.
- Confirm `BACKEND_BASE_URL` and `FRONTEND_BASE_URL` match the custom HTTPS domain.
- If Google OAuth redirects use `http`, verify `server.forward-headers-strategy: native` in prod config.

### S3 upload

- Distinguish `403` on `/api/assets/upload-intent` from `403` on S3 `PUT`.
- If the browser fails on S3 `PUT`, check bucket existence, bucket CORS, and the Beanstalk instance role.
- Remember: uploads are browser-direct presigned S3 uploads.

### Preview Lambda

- First preview request may legitimately return `404` while generation is triggered.
- Persistent preview `404` means the preview object was never generated.
- Check:
  - `ACTS_PREVIEW_VIDEO_THUMBNAIL_LAMBDA_FUNCTION_NAME`
  - Beanstalk role `lambda:InvokeFunction`
  - Lambda execution role S3 access for the prod bucket
  - Lambda CloudWatch logs
- If preview code changes, rebuild and push the Lambda image, then update the Lambda function image.

## References

- Runtime assumptions and current deploy choices: [`references/current-runtime.md`](references/current-runtime.md)
