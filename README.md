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

