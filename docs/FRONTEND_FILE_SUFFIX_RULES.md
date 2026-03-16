# Frontend File Suffix Rules

## Purpose

Use file names that expose responsibility at a glance.

## Scope

- target: `apps/frontend/src/**/*.ts` and `apps/frontend/src/**/*.tsx`
- exclude: test files and `src/e2e/**`

## Rules

### `src/pages/**`

- TSX suffixes:
  - `-page`
  - `-page-container`
  - `-detail-page`
  - `-detail-page-container`
  - `-modal`
  - `-panel`
  - `-section`
  - `-shell`
  - `-toolbar`
  - `-drawer`
- TS suffixes:
  - `-location`
  - `-utils`
  - `-mapper`
  - `-state`
  - `-schema`
  - `-model`
  - `-persistence`
  - `-visibility`
- exceptions:
  - `use-*`
  - `validation.ts`

### `src/components/ui/**`

- TSX only
- plain primitive names such as `button.tsx`

### `src/components/**`

- TSX only
- shared presentational names

### `src/lib/**`

- TS only
- `use-*` or shared utility names

### `src/dashboard-api/**`

- TS only
- prefer `-api`, `-parsers`, `-shared`, `-upload`
- allowed root exceptions: `http.ts`, `parsers.ts`

### `src` root

- allowed files:
  - `app.tsx`
  - `main.ts`
  - `dashboard-api.ts`
  - `dashboard-auth.ts`
  - `dashboard-routes.ts`
  - `dashboard-theme.ts`
  - `dashboard-types.ts`

