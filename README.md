# acts

`acts` is a monorepo skeleton for a product team that wants a small, agent-friendly
starting point.

## Layout

| Path | Purpose |
| --- | --- |
| `apps/backend` | Kotlin + Spring Boot API skeleton |
| `apps/frontend` | React + Vite UI skeleton |
| `infra` | Local development infrastructure |
| `docs` | Brief, architecture, infra, deploy, and conventions |
| `.agents/skills` | Repo-local skills for recurring workflows |

## Working Style

- Keep product intent in `docs/BRIEF.md`.
- Keep structure and boundaries in `docs/ARCHITECTURE.md`.
- Keep agent rules in `AGENTS.md`.
- Prefer small feature slices over wide scaffolding.

## First Steps

1. Fill in `docs/BRIEF.md`.
2. Confirm or replace the default stack in `docs/ARCHITECTURE.md`.
3. Add the first backend and frontend feature with the naming rules in `docs/FRONTEND_FILE_SUFFIX_RULES.md`.

## Deployment

- Web app deploy target: AWS Elastic Beanstalk in `ap-northeast-2`
- Web app images are built in GitHub Actions and pushed to Amazon ECR before Elastic Beanstalk deploys them
- Stage deploy trigger: push to the `stage` branch
- Production deploy trigger: push a Git tag that matches `v*` such as `v1.0.1`
- Production tags must be created from the exact commit that finished stage verification
- If release-only fixes are needed, create `release/vX.Y.Z` from the validated stage commit, make the final fixes there, then tag that final commit

Example production release:

```bash
git checkout <validated-commit>
git tag v1.0.1
git push origin v1.0.1
```

See `docs/DEPLOY.md` for Elastic Beanstalk setup, ECR prerequisites, environment variables, and the full release checklist.
