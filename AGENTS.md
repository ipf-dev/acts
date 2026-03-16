# AGENTS.md

Problem definition -> small, safe change -> change review -> refactor.

## Core Rules

- Read the whole file before changing it.
- Read related definitions, references, docs, and tests before editing a symbol.
- Keep changes small and intention-revealing.
- Update `docs/BRIEF.md` and `docs/ARCHITECTURE.md` when scope or structure changes.
- Prefer explicit code over clever abstractions.
- Keep side effects at the boundary layer.

## Monorepo Defaults

- `apps/backend` is feature-oriented and controller-light.
- `apps/frontend` separates pages, API access, shared UI, and utilities.
- `infra` stores only local or shared environment bootstrap assets.
- `docs` is the source of truth for product and operating context.

## Local Skills

### Available skills

- `project-brief-sync`: Keep `docs/BRIEF.md`, `docs/ARCHITECTURE.md`, and scope decisions aligned. (file: `.agents/skills/project-brief-sync/SKILL.md`)
- `react-feature-conventions`: Create frontend files that match the repo naming, layering, and React state/effect rules. (file: `apps/frontend/.agents/skills/react-feature-conventions/SKILL.md`)
- `spring-boot-kotlin-conventions`: Create backend feature slices that match the repo package layout, DTO boundaries, configuration, and test rules. (file: `apps/backend/.agents/skills/spring-boot-kotlin-conventions/SKILL.md`)

### How to use skills

- Use a skill when the request matches its description or the user names it directly.
- Read only the minimum part of the skill needed to do the job.
- Reuse scripts, references, and templates from the skill before inventing new ones.
