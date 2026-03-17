# Architecture

## Intent

This repository is optimized for:

- small feature slices
- fast codebase navigation
- AI-assisted implementation and review

The first product slice should support a single internal production loop:

- authenticate internal users through domain-restricted Google SSO
- request AI-assisted scenario drafts
- request AI-assisted image drafts
- store assets and generation history in one hub
- keep Harmony Hills IP guidance available at the point of creation

## Top-Level Structure

| Path | Role |
| --- | --- |
| `apps/backend` | API, auth, persistence, background integration edges |
| `apps/frontend` | UI, route composition, API clients, presentational primitives |
| `infra` | local infra bootstrap such as databases or emulators |
| `docs` | product brief, architecture, infra, deploy, conventions |

## Backend Shape

Default package direction:

- `com.acts.<feature>` for feature code
- controller -> service -> repository flow
- thin controllers
- explicit request and response DTOs

Split large services before they become multi-purpose coordinators.

Expected first-slice backend capabilities:

- domain-restricted Google SSO and session identity lookup
- auth success event logging at the SSO boundary
- PostgreSQL-backed user directory plus single organization catalog
- user org assignment lookup with admin override support
- company-wide viewer allowlist with immediate permission recalculation
- audit logging for login success plus admin org and permission changes
- asset metadata in PostgreSQL with binary files stored in object storage
- LocalStack S3-backed multipart upload endpoint for the first asset slice
- asset catalog tables for `assets`, `asset_files`, `asset_tags`, and `asset_events`
- filename/type-based tag suggestion, description capture, image metadata extraction, and creator/org stamping
- asset detail lookup, metadata update, and backend download endpoint
- generation request orchestration
- IP guide retrieval for AI workflows
- revision and activity history recording

## Frontend Shape

Default directory direction:

- `src/pages/**` for route-level screens and page containers
- `src/dashboard-api/**` for HTTP and parsing boundaries
- `src/components/ui/**` for reusable primitives
- `src/lib/**` for shared helpers and hooks

Expected first-slice frontend surfaces:

- login entry, session status, and admin override screens
- user-facing auth failure notification after login redirects
- searchable admin user table with per-user organization assignment
- admin allowlist management and audit log views
- asset library page with upload modal, tag chips, search, and basic filters
- asset detail modal with summary, history, editable metadata, and download action
- generation request forms and result views
- searchable asset detail flows
- guide-aware creation UI

## Docs Contract

When the scope changes:

1. update `docs/BRIEF.md`
2. update `docs/ARCHITECTURE.md` if boundaries changed
3. update `AGENTS.md` or local skills if workflow rules changed
