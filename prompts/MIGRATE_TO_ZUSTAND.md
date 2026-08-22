# Migrate a Context to Zustand Store Slices — Master Guide

Drop this file into a fresh session as the starting context whenever you migrate
an existing piece of app context/state into this project's Zustand store pattern.
It is the **index**: it explains the goal, the order of work, and points to the
detailed prompt for each step. Open each referenced prompt when you reach that
step — do not try to hold every detail in one prompt.

> **Read this whole file first, then start at Step 0.** Every step ends with the
> same verification gate: `npm run build && npx oxlint src && npm run test` must be
> green (lint 0/0) before moving on.

## The one rule that governs everything

**Infer the pattern from the existing codebase; never copy the example app's
pages, fields, or seeds verbatim.** The reference slices
(profile/company/billing/preferences) and the `{{Name}}`/`{{name}}` tokens in the
template are *illustrative*. Apply the *principles* to the real context you are
migrating — its actual keys, fields, and API layer. If the reference and this
app's reality disagree, the app wins.

## What you are migrating toward (the pattern in one screen)

- **Folder-per-page slice**: `src/stores/slices/<name>/` with `types.ts`
  (owns `<Name>Form`), `constants.ts` (`emptyForm`), `slice.ts` (wiring only), and
  `actions/*.ts` — **one file per verb** (`stage`, `apply`, `hydrate`, `persist`,
  `reset`, `partialize`).
- **Soft / hard / dirty**: soft fields live FLAT on the slice root (persisted to
  `sessionStorage`); `hard` is one nested object (in-memory baseline); `dirty =
  !deepEqual(soft, hard)`.
- **Explicit inlining**: every action spells out its field list — no generic
  gather/spread helpers — so TypeScript flags any action that forgets a new field.
- **Thin registry** (`pages.ts`): `PAGE_KEYS` tuple + `PageFormData` composed from
  each slice's own `<Name>Form`.
- **Single-file cross-cutting slices**: `sessionSlice.ts` (identity + wipe-on-
  change) and `hydrationSlice.ts` (bulk load + exhaustive fan-out).
- **Cross-slice updates**: one slice/view drives another by calling its ACTION via
  `get().<other>.action()` (`get()` is typed against the whole `AppStore`) — NEVER
  by mutating another slice's state (`set((s) => { s.other.x = … })`). Reads use
  `get().<other>.value` (e.g. `get().session.sessionId`). See
  `prompts/ANALYZE_EXISTING_CONTEXT.md` §5.
- **Reading the store (NON-NEGOTIABLE — a past migration lost hours here):**
  default to **atomic selectors** (`const x = useAppStore((s) => s.x)`); group
  related reads ONLY via **`useShallow`**
  (`useAppStore(useShallow((s) => ({ ... })))`). **NEVER** return a bare
  object/array literal from a selector — it returns a new reference every render
  and re-renders on every store change. Before finishing any component, grep it for
  `useAppStore((s) => ({` / `useAppStore((s) => [` and confirm each is wrapped in
  `useShallow` or split atomically. See `prompts/ANALYZE_EXISTING_CONTEXT.md` §4.

## Build / migration order

Do these **in order**. Each links to its own prompt with full detail.

### Step 0 — Ground yourself in the reference (read-only)
Before writing anything, study the living reference so your migration matches it:
- `docs/ADD_A_PAGE.md` — the end-to-end guide (soft/hard/dirty, the wiring
  checklist, hydration patterns, verification).
- `src/stores/slices/_TEMPLATE_slice.ts.txt` — the annotated slice-folder template
  (`{{Name}}`/`{{name}}` tokens).
- `src/stores/appStore.ts`, `src/stores/pages.ts`, and one full page-slice folder
  (e.g. `src/stores/slices/company/`).
Then map the context you're migrating: its page key(s), real form fields, and how
it currently loads/saves data.

### Step 1 — Base store → `prompts/IMPLEMENT_BASE_STORE.md`
Stand up (or extend) `appStore.ts` + the `pages.ts` registry: `AppStore` type,
`persist(immer(...))` stack, `partialize` delegating to slices,
`reconcileHardWithSoft`, deepMerge/rehydrate wiring. Skip if the base store
already exists — just register the new key when you reach Step 4.

### Step 2 — Session slice → `prompts/IMPLEMENT_SESSION_SLICE.md`
Single-file `sessionSlice.ts`: `sessionId`, `ensureSession`, `wipeSoftData`
(loops `PAGE_KEYS`), `setSessionId`, `resetSession`. Usually already present —
review, don't recreate.

### Step 3 — Hydration slice → `prompts/IMPLEMENT_HYDRATION_SLICE.md`
Single-file, top-level `hydrationSlice.ts`: one `queryPagesByUser` call + an
explicit `switch (item.sk)` fan-out with the `never` exhaustiveness guard. When
you add a page in Step 4, add its `case` here.

### Step 4 — Page slice, ONE at a time
**4a. Analyze first → `prompts/ANALYZE_EXISTING_CONTEXT.md`.** For each context,
produce a migration plan: classify PERSISTED (soft) vs VOLATILE (non-persisted)
data, map existing Apollo queries/mutations to slice actions, list which
React-state hooks (`useState`/`useMemo`/`useCallback`/`useRef`/`useEffect`) to
delete because the store now owns that logic, and note any cross-slice
touch-points (what this context reads/drives on other slices). Do not skip this —
it defines the slice's `{{Name}}Form` and its actions.

**4b. Implement → `prompts/IMPLEMENT_PAGE_SLICE.md`.** Using the plan, create the
slice folder, wire it into `pages.ts`, `appStore.ts`, `hydrationSlice.ts`, and the
API SEED/schema, then verify green **before starting the next page**. Repeat per
page.

### Step 5 — Store & slice tests → `prompts/IMPLEMENT_STORE_TESTS.md`
Right after each slice, add its unit tests through the live `useAppStore` (no
React). The per-file action factories make this easy: one `describe` per action.

### Step 6 — Hook & component tests → `prompts/IMPLEMENT_COMPONENT_TESTS.md`
Once a page's component consumes the slice, test the store↔UI wiring via
`renderWithStore` — asserting BOTH the rendered UI and the store state.

## Per-migration checklist (copy into your working notes)

- [ ] Identified the page key(s) and the REAL form fields for this context.
- [ ] Base store + registry in place (Step 1) — new key registered.
- [ ] Session + hydration slices present/updated (Steps 2–3); `case` added for the
      new key with the exhaustiveness guard still compiling.
- [ ] Analyzed the context (Step 4a): persisted-vs-volatile table, query→action
      map, React-state-hook disposition list, and cross-slice touch-point list
      produced.
- [ ] Cross-slice updates go through `get().<other>.action()` (or read
      `get().<other>.value`) — no `set((s) => { s.other.x = … })` into another slice.
- [ ] Page slice folder created with all files + explicit inlined fields (Step 4b).
- [ ] Wired into `pages.ts`, `appStore.ts`, `hydrationSlice.ts`, API SEED/schema.
- [ ] Slice unit tests added (Step 5) and component/hook tests added (Step 6).
- [ ] Selector self-check passed: no unwrapped `useAppStore((s) => ({ … }))` /
      `=> [ … ]`; multi-value reads use `useShallow`, everything else is atomic.
- [ ] `npm run build && npx oxlint src && npm run test` all green.

## Reference index (open as needed)

| Concern | File |
| --- | --- |
| This master guide | `prompts/MIGRATE_TO_ZUSTAND.md` |
| Base store + registry | `prompts/IMPLEMENT_BASE_STORE.md` |
| Session slice | `prompts/IMPLEMENT_SESSION_SLICE.md` |
| Hydration slice | `prompts/IMPLEMENT_HYDRATION_SLICE.md` |
| Analyze a context (before each page) | `prompts/ANALYZE_EXISTING_CONTEXT.md` |
| Page slice (repeat per page) | `prompts/IMPLEMENT_PAGE_SLICE.md` |
| Store/slice tests | `prompts/IMPLEMENT_STORE_TESTS.md` |
| Hook/component tests | `prompts/IMPLEMENT_COMPONENT_TESTS.md` |
| End-to-end page guide | `docs/ADD_A_PAGE.md` |
| Annotated slice template | `src/stores/slices/_TEMPLATE_slice.ts.txt` |
| Live reference implementation | `src/stores/` (`appStore.ts`, `pages.ts`, `slices/`) |
