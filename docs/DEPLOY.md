# Deploy Guide

## Context

This file is a placeholder deploy runbook.

## Target Surfaces

- `apps/backend`
- `apps/frontend`
- `infra/aws/video-preview-lambda`

## Current Runtime Notes

- backend runtime target: `ECS`
- frontend hosting target: to be decided
- video preview worker: `AWS Lambda` using `container image` package type from `ECR`

## Minimum Decisions To Fill In

- deploy environment names
- CI entrypoint
- frontend hosting target
- rollback path

## Release Checklist

1. Confirm `docs/BRIEF.md` still matches shipped scope.
2. Confirm environment variables and secrets are documented.
3. Confirm build and smoke checks pass.
4. Confirm rollback command or procedure is written here.
5. Confirm the target Lambda function points at the intended ECR image tag or digest.
