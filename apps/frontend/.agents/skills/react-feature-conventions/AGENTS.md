# React Feature Conventions

Use this skill when creating frontend files for the `acts` monorepo.

## Routing and Pages

- `src/pages/**` holds route-level files.
- `*-page-container.tsx` owns data loading and orchestration.
- `*-page.tsx` owns rendering.

## Shared Boundaries

- `src/dashboard-api/**` owns request and parsing concerns.
- `src/components/ui/**` owns reusable UI primitives.
- `src/lib/**` owns hooks and utilities.

## Naming

- Follow `docs/FRONTEND_FILE_SUFFIX_RULES.md`.
- Prefer names that describe responsibility, not appearance.

