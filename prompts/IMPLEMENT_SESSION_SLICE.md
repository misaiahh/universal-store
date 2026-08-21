# Prompt: Implement the Session Slice

You are building the **session slice** — the slice that owns the identity every
other slice is keyed by. Work from the existing codebase; do not copy the example
app's fields blindly.

## Where this fits

This is **step 2 of 4**:

1. Base store ✅ (`appStore.ts` + `pages.ts`)
2. **Session slice** ← _you are here_
3. Hydration slice (`IMPLEMENT_HYDRATION_SLICE.md`)
4. Each page slice, one at a time (`IMPLEMENT_PAGE_SLICE.md`)

## Read the codebase first — do NOT duplicate the example

Study the reference `src/stores/slices/sessionSlice.ts` and note how the base
store (`appStore.ts`) wires it in and persists it. The reference uses example
page keys — **infer the pattern, not the specific pages.** Apply it to THIS app's
real `PAGE_KEYS` and its real identity model. If this app names or scopes the
session differently, follow this app.

## Key facts about this slice

- It is a **single file** (`src/stores/slices/sessionSlice.ts`), NOT a folder.
  Session has no soft/hard/dirty form data, so the per-verb `actions/` folder
  pattern used by page slices does not apply here.
- Its state **nests under a `session` key** — the `StateCreator` returns
  `{ session: { ... } }`, unlike the hydration slice which is spread at top level.
- The `sessionId` is the **only** part of this slice that is persisted (the base
  store's `partialize` writes `{ session: { sessionId } }`). Everything else is
  behavior.

## What to produce

`src/stores/slices/sessionSlice.ts` with:

- **`SessionSlice` interface**: at minimum `sessionId: string` plus the actions
  below. Type the `StateCreator` against `AppStore` with the immer mutator
  (`[['zustand/immer', never]]`) and a return of `{ session: SessionSlice }`.
- **`ensureSession()`**: if `sessionId` is empty, mint a fresh id (e.g.
  `crypto.randomUUID()`) via `set`. Idempotent — safe to call on every load.
- **`wipeSoftData()`**: iterate `PAGE_KEYS` (imported from `../pages`) and call
  `get()[key].reset()` on each page slice. This is the one place a generic loop
  over pages is correct — adding a new page needs **no** change here.
- **`setSessionId(id)`**: if the id is unchanged, no-op; otherwise wipe the old
  session's soft data, then set the new id.
- **`resetSession()`**: wipe soft data, then mint a brand-new id.

Adapt names/extra fields to whatever THIS app's identity actually requires — but
keep the "mint if missing / wipe-on-change" semantics.

## Rules

- Use `get()` for reads and cross-slice calls; use `set((s) => { ... })` for
  immer mutations. Never mutate outside `set`.
- Keep the PAGE_KEYS loop for `wipeSoftData` — do NOT hard-code page names there.
- Match the surrounding code style; no extra explanatory comments beyond the
  reference.

## Verify

```
npm run build && npx oxlint src && npm run test
```

All green before moving on to the hydration slice.
