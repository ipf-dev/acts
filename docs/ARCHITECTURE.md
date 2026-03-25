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
- seeded internal account roster with stored role precedence over bootstrap admin emails
- user org assignment lookup with admin override support
- authorization derived from user role and company-wide viewer status
- company-wide viewer allowlist with immediate permission recalculation
- per-user feature allow/deny overrides with audit logging
- audit logging for login success plus admin org, feature, and permission changes
- asset metadata in PostgreSQL with binary files stored in object storage or external links stored as metadata-only records
- LocalStack S3-backed file upload endpoint plus metadata-only link registration endpoint for the first asset slice
- asset catalog tables for `assets`, `asset_files`, `asset_tags`, and `asset_events`
- filename/type or URL/link-type-based tag suggestion, description capture, image metadata extraction, video thumbnail generation, and creator/org stamping
- centralized asset authorization for list/detail/download/update/delete/export
- shared asset visibility for all authenticated users, with owner/Admin management rules and company-wide export privileges
- asset detail lookup for both modal and page, image/video preview endpoint, metadata update, owner/admin soft delete, backend download endpoint, and ZIP export endpoint
- asset retention policy storage plus trash restore lifecycle endpoints
- generation request orchestration
- IP guide retrieval for AI workflows
- revision and activity history recording

## Frontend Shape

Default directory direction:

- `src/pages/**` for route-level screens and page containers
- `src/dashboard-api/**` for HTTP and parsing boundaries
- `src/components/ui/**` for `shadcn/ui`-based reusable primitives
- `src/lib/**` for shared helpers and hooks

Expected first-slice frontend surfaces:

- login entry, session status, and admin override screens
- user-facing auth failure notification after login redirects
- Figma Make 기준의 shell 레이아웃, 현재 사용자 프로필 메뉴, 자산 검색 헤더
- searchable admin user table with per-user organization assignment, role visibility, and company-wide viewer state
- admin allowlist management and audit log views
- admin feature authorization tab with searchable user selection, per-feature allow/deny matrix, and save flow for the currently implemented asset library feature
- admin policy tab for retention settings and deleted asset restore status/actions
- asset library page with file/link split upload modal, tag chips, search, org/creator filters, and company-wide viewer export action
- shell-level feature gating so denied users cannot enter the implemented asset library surface
- asset detail modal plus detail page with image/video preview or external link summary, history, editable metadata, download/open-link action, and owner/admin delete action
- generation request forms and result views
- searchable asset detail flows
- guide-aware creation UI

## Docs Contract

When the scope changes:

1. update `docs/BRIEF.md`
2. update `docs/ARCHITECTURE.md` if boundaries changed
3. update `AGENTS.md` or local skills if workflow rules changed
