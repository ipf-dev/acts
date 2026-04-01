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
| `infra` | local bootstrap plus shared deployment assets such as Lambda worker packaging |
| `docs` | product brief, architecture, infra, deploy, conventions |

## Runtime Deployment Note

- production delivery target: one containerized web service for the primary web app
- production web packaging: frontend static build and backend API delivered on the same origin
- reason: preserve current Google SSO redirect flow, session handling, and frontend relative `/api` calls without introducing cross-origin auth complexity
- deploy region target: `ap-northeast-2` (`Seoul`)
- `Elastic Beanstalk` is selected for the fastest first deployment path
- `App Runner` is excluded because Seoul region support is unavailable
- background preview generation remains a separate Lambda container worker
- asset binaries remain in S3 and metadata remains in a PostgreSQL cluster

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
- PostgreSQL-cluster-backed user directory plus single organization catalog
- manual user and organization bootstrap handled outside the repo, with roles persisted directly in PostgreSQL
- user org assignment lookup with admin override support
- admin role source of truth stored in PostgreSQL `user_accounts.role`, with admin-only role promotion and audit logging
- authorization derived from user role and company-wide viewer status
- company-wide viewer allowlist with immediate permission recalculation
- per-user feature allow/deny overrides with audit logging
- audit logging for login success plus admin org, feature, and permission changes
- asset metadata in PostgreSQL with binary files stored in object storage or external links stored as metadata-only `URL` records
- object-storage-backed file upload endpoint plus metadata-only `URL` link registration endpoint for the first asset slice
- file asset download and playback URLs issued as short-lived presigned GET links after backend authorization, with S3 Transfer Acceleration auto-detected when available
- asset catalog tables for `assets`, `asset_files`, `asset_tags`, `asset_events`, plus character taxonomy tables `character_tags`, `character_tag_aliases`
- structured asset tags for `CHARACTER` / `LOCATION` / `KEYWORD`, character alias-aware search indexing, description capture, image metadata extraction, 이미지/오디오/영상/문서별 세부 메타데이터 저장, 기존 `SCENARIO` 타입은 `DOCUMENT` + `documentKind=SCENARIO`로 흡수, 링크는 `URL` 타입으로 저장, async dispatch of video thumbnail generation to a dedicated Lambda image worker, creator/org stamping, and no user-facing asset status field
- centralized asset authorization for list/detail/download/update/delete/export
- shared asset visibility for all authenticated users, with owner/Admin management rules and company-wide export privileges
- asset catalog query endpoint with server-side pagination, search, org/creator/type metadata filters, and separate filter-option lookup for library controls
- asset detail lookup for the dedicated detail page, image/video preview endpoint, metadata update, owner/admin soft delete, presigned download redirect endpoint, and ZIP export endpoint
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

- branded landing page as the pre-auth entry, then authenticated shell navigation for assets/admin
- login entry, session status, and admin override screens
- user-facing auth failure notification after login redirects
- Figma Make 기준의 shell 레이아웃, 현재 사용자 프로필 메뉴, 자산 검색 헤더
- searchable admin user table with per-user organization assignment, role visibility, and admin-only promotion action
- audit log views, with company-wide viewer and allowlist controls currently hidden in the frontend UI
- admin feature authorization tab with searchable user selection, per-feature allow/deny matrix, and save flow for the currently implemented asset library feature
- admin tag management tab with character create/edit/delete + alias support and location/keyword search, usage-sorted pagination, and unified rename/merge/delete dialogs
- admin policy tab for retention settings and deleted asset restore status/actions
- asset library page with file/link split upload modal, 확장자 기반 이미지/오디오/영상/문서 세부 메타데이터 입력, 링크의 `URL` 타입 분리, same-metadata-based image/audio/video/document filters, a background upload progress toast panel updated independently from the main library list render and calculated from uploaded bytes instead of completed file counts, character dropdown + location/keyword tag suggestion search, grouped tag display, server-backed search, org/creator filters, page controls, and company-wide viewer export UI currently hidden
- shell-level feature gating so denied users cannot enter the implemented asset library surface
- asset detail page with image/video preview or external link summary, history, 타입별 세부 메타데이터를 포함한 editable metadata, download/open-link action, and owner/admin delete action
- generation request forms and result views
- searchable asset detail flows
- guide-aware creation UI

## Docs Contract

When the scope changes:

1. update `docs/BRIEF.md`
2. update `docs/ARCHITECTURE.md` if boundaries changed
3. update `AGENTS.md` or local skills if workflow rules changed
