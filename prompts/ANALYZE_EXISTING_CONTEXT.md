# Prompt: Analyze an Existing Context Before Migrating

Before you write a single slice, **analyze the existing context/component you are
migrating** and produce a migration plan. This step decides what the slice looks
like: which data persists, which is volatile, which async reads become actions,
and which React-state logic disappears because the store now owns it.

## Where this fits

This is the **analysis step of Step 4** in `MIGRATE_TO_ZUSTAND.md`. Do it once per
context, before `IMPLEMENT_PAGE_SLICE.md`. Feed its output straight into the slice
implementation.

## Read the codebase first — do NOT duplicate the example

Study the reference (`docs/ADD_A_PAGE.md`, `src/stores/appStore.ts`,
`src/stores/slices/company/` and the Apollo-backed `profile/` slice) to see the
target shape. **Infer the pattern, not the fields.** Then read the existing
context end to end: its state, its data fetching, and every hook/component that
consumes it.

## 1. Classify data: PERSISTED (soft) vs VOLATILE (non-persisted)

Split every piece of state the context holds into two buckets — this determines
what goes in `{{Name}}Form` vs. what stays as transient slice state.

- **PERSISTED / soft** = user-editable domain data that should survive a tab
  refresh. These become the FLAT fields on the slice root and the ONLY thing
  `partialize()` returns (written to `sessionStorage`). Examples: form inputs,
  selections, drafts.
- **VOLATILE / non-persisted** = anything derived, transient, or server-owned:
  - The `hard` baseline (last-saved server copy) — in-memory only.
  - Status flags: `dirty`, `saving`, `savedAt`, `hydrating`, load/error state.
  - Fetched read-models that are re-fetched on demand (e.g. the profile
    `activity` tree) — kept in slice state but NOT in `partialize()`.

Deliverable: a table listing each field → bucket → where it lives (`{{Name}}Form`
field vs. volatile slice field) → whether it appears in `partialize()`.

**Rule:** if you can re-derive or re-fetch it, it is volatile. Only genuine
user-authored input is persisted.

## 2. Migrate Apollo queries into slice ACTIONS

Every `useQuery`/`useMutation`/`useLazyQuery`/`client.query` in the existing
context becomes a slice action, not a hook call inside a component:

- **Reads that seed the form** → the slice's `hydrate` action (or the top-level
  `hydrate()` fan-out) via the API layer (`getPageForm`/`queryPagesByUser`), so the
  server copy lands as the clean `hard` baseline.
- **Writes/saves** → the slice's `persist` action (`putPageForm` / the mutation),
  updating `hard`, recomputing `dirty`, setting `savedAt`.
- **Auxiliary reads** (a nested read-model unrelated to the form) → a dedicated
  action file, mirroring profile's `loadActivity` (stores the result in volatile
  slice state) or `fetchActivity` (returns it directly). Put the `gql` document +
  the typed `query*` wrapper in the `src/api/` layer, and own any result types in
  the slice's `types.ts`.
- **Apollo results are deep-frozen** — `structuredClone` before storing anything
  in immer. Prefer the existing `src/api/apolloClient.ts` client; do not create a
  new one.

Deliverable: a mapping of each existing query/mutation → target action file →
which state it writes.

## 3. Keep business logic in the store; strip React state tools

The store (slice actions + selectors) is the state manager. Component/hook code
should mostly **read a value and call an action** — nothing more. Aggressively
remove local React state that the store now owns:

- **`useState`** for form fields, dirty flags, saving/loading, drafts →
  **delete.** Read from the slice (`useAppStore((s) => s.<name>.<field>)`) and
  write via `stage`/`persist`/etc. Local `useState` is only acceptable for
  genuinely ephemeral, non-domain UI (e.g. an "is this dropdown open" toggle that
  never needs to persist or be shared) — and even then, prefer the store if in
  doubt.
- **`useMemo`** for deriving values from state (e.g. `dirty`, totals, filtered
  lists) → **move the derivation into the slice** (a computed field updated in an
  action, like `dirty`) or into a plain selector. Zustand selectors already
  memoize by reference; recompute in the action, not the render.
- **`useCallback`** to stabilize handlers that call the context → usually
  **unnecessary**: slice actions are stable references created once, so pass them
  directly. Remove `useCallback` wrappers whose only job was memoizing a dispatch.
- **`useRef`** used to hold state across renders or mirror the latest value →
  **delete**; `get()` inside an action always sees the current state. Keep `useRef`
  ONLY for real DOM refs (focus, measuring, imperative DOM APIs).
- **`useEffect`** that syncs local state with the context, or fires a fetch on
  mount → replace with a direct action call (`hydrate`) at the appropriate seam;
  keep effects only for true side effects (subscriptions, timers, DOM).

Deliverable: a list of each React-state hook in the existing component → keep /
remove / replace-with-store, with the store equivalent named.

## Output of this prompt

A short written migration plan for THIS context:
1. Data classification table (persisted vs volatile).
2. Query/mutation → action mapping.
3. React-state-hook disposition list.
4. The resulting `{{Name}}Form` field list + any extra volatile slice fields and
   auxiliary action files.

Hand this plan to `IMPLEMENT_PAGE_SLICE.md` (and its tests). If any field's bucket
or any query's target is ambiguous, ASK before implementing — do not guess.

## Verify (after implementing from the plan)

```
npm run build && npx oxlint src && npm run test
```
