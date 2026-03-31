# Current Runtime

## Production Shape

- region: `ap-northeast-2`
- web app: `Elastic Beanstalk`
- delivery: single Docker web app serving frontend + backend on the same origin
- custom domain: `https://acts.ai-laura.com`
- database: PostgreSQL on RDS
- asset bucket: `acts-assets-prod`
- preview worker: Lambda container image from ECR
- preview function name: `acts-video-preview-generator`

## Key Files

- web prod config: `apps/backend/src/main/resources/application-prod.yml`
- deploy guide: `docs/DEPLOY.md`
- infra guide: `docs/INFRASTRUCTURE.md`
- preview worker: `infra/aws/video-preview-lambda/`

## Important Known Behavior

- App Runner is excluded because Seoul support was unavailable during setup.
- Google OAuth in prod depends on:
  - HTTPS custom domain
  - ALB `443` listener + ACM certificate
  - `server.forward-headers-strategy: native`
- Asset upload is browser-direct S3 upload via presigned URL.
- Asset download is backend-authorized redirect to a presigned GET URL.
- Video preview is async:
  - preview endpoint checks for `${objectKey}.preview.jpg`
  - if missing, backend triggers Lambda async
  - first preview request can return `404`

## Common Failure Modes

### Web app

- `502` on `/api/health`: app did not start or nginx upstream is broken
- OAuth redirect mismatch: `BACKEND_BASE_URL` / Google redirect URI mismatch
- cert mismatch on Beanstalk default domain: use the custom domain, not the `elasticbeanstalk.com` host

### RDS

- datasource URL must start with `jdbc:postgresql://`
- same VPC / SG alignment is the first thing to verify

### S3 upload

- `acts-assets-prod` bucket missing: presigned URLs still generate, but upload fails
- bucket CORS missing for `https://acts.ai-laura.com`
- Beanstalk instance role missing `s3:PutObject`

### Preview Lambda

- Beanstalk role missing `lambda:InvokeFunction`
- Lambda execution role missing `s3:GetObject` / `s3:PutObject` on `acts-assets-prod`
- updating Beanstalk will not update Lambda
- updating Lambda requires:
  - rebuild image
  - push to ECR
  - `aws lambda update-function-code --image-uri ...`
- Lambda rejects manifest-list / attested images; use single-platform image builds when needed

## Operational Notes

- If the work is “organization catalog / user org assignment / auth data,” it is usually a DB/Flyway task, not a Beanstalk config task.
- If the work is “preview thumbnail generation,” separate:
  - web trigger path
  - Lambda image code
  - ECR push
  - Lambda execution role
