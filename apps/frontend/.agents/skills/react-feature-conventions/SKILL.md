---
name: react-feature-conventions
description: Create or refactor frontend feature files in this repo using the page, API, lib, and UI layering rules plus standard React state, effect, and custom Hook guidance. Use when adding new React screens, containers, API clients, hooks, or shared frontend helpers inside apps/frontend.
---

# React Feature Conventions

## Workflow

1. Read `docs/FRONTEND_FILE_SUFFIX_RULES.md`.
2. Read every existing page, API, hook, and shared UI file you will touch before editing.
3. Put route-level files in `src/pages`.
4. Put HTTP boundaries in `src/dashboard-api`.
5. Put reusable primitives in `src/components/ui`.
6. Prefer `shadcn/ui` components and patterns for shared UI before inventing custom primitives.
7. Keep page shells and containers orchestration-heavy and page components presentational.

## Placement Rules

- `src/pages/**`: route entrypoints, page containers, page shells, page-local state, and page-local mappers.
- `src/dashboard-api/**`: fetch calls, request/response parsing, transport DTOs, and API-specific adapters.
- `src/components/ui/**`: reusable primitives with prop-driven behavior and no product-specific data fetching.
- `src/components/ui/**`: prefer `shadcn/ui`-style components backed by `components.json` and the `@/` alias setup.
- `src/lib/**`: shared hooks and helpers that are not tied to a single page.
- `src` root: only app composition files already allowed by `docs/FRONTEND_FILE_SUFFIX_RULES.md`.

## React Rules

- Keep render pure. Derive JSX from props, state, and context instead of mutating pre-existing objects or variables during render.
- If logic only derives one value from existing props or state, compute it during render first. Do not add an Effect just to mirror state.
- When two components must stay in sync, lift the shared state to their closest common parent and pass it down through props.
- Extract reusable stateful logic into focused custom hooks named `use-*`. Prefer hooks that express a product use case, not generic lifecycle wrappers.
- Keep raw `useEffect` code at the boundary. If the Effect talks to the network, browser APIs, or subscriptions and the logic is reusable, move it into a custom hook under `src/lib`.
- Keep network calls and response mapping out of TSX files unless a route file is only orchestrating existing API helpers.
- Prefer `startTransition`, `useDeferredValue`, and `useEffectEvent` when the interaction actually needs them. Do not add `useMemo` or `useCallback` by default unless the surrounding code already depends on them.
- When a shared control already exists in `shadcn/ui`, add or adapt that component instead of creating a parallel custom primitive.

## Verification

- Run `npm run lint:file-suffixes` after creating or moving frontend files.
- Run `npm run build` before finishing changes that affect runtime behavior.

## Reference Anchors

- React: [Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- React: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- React: [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- React: [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

## Default Output

- new files in the right layer
- names that match the suffix rules
- pure, prop-driven components with minimal cross-layer leakage
- effects, hooks, and API code placed at explicit boundaries
