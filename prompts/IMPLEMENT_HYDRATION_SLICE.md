# Prompt: Implement the Hydration Slice

You are building the **hydration slice** — the one that bulk-loads every page's
saved data from the API in a single query and fans it out to each page slice.
Work from the existing codebase; do not copy the example app's page list blindly.

## Where this fits

This is **step 3 of 4**:

1. Base store ✅ (`appStore.ts` + `pages.ts`)
2. Session slice ✅
3. **Hydration slice** ← _you are here_
4. Each page slice, one at a time (`IMPLEMENT_PAGE_SLICE.md`)

## Read the codebase first — do NOT duplicate the example

Study the reference `src/stores/slices/hydrationSlice.ts`, the API layer it calls
(`src/api/dynamoClient.ts` — `queryPagesByUser` and the `PageItem` / `AnyPageItem`
types), and how `appStore.ts` spreads this slice at the top level. The reference
switches over example page keys — **infer the fan-out pattern, not the specific
cases.** Build the switch from THIS app's real `PAGE_KEYS`.

## Key facts about this slice

- It is a **single file** (`src/stores/slices/hydrationSlice.ts`), NOT a folder.
- It is **spread at the TOP level** of the store (accessed as `store.hydrate()`,
  `store.hydrating`) — unlike session/page slices, it does NOT nest under a key.
- One network round-trip loads ALL pages: `queryPagesByUser(sessionId)` returns
  one item per page, discriminated by `item.sk` (a `PageKey`).

## What to produce

`src/stores/slices/hydrationSlice.ts` with:

- **`HydrationSlice` interface**: status fields `hydrating: boolean`,
  `hydratedAt: string | null`, `hydrationError: string | null`, and
  `hydrate: (sessionId?: string) => Promise<void>`.
- **`hydrate()`**:
  - Default the arg to `get().session.sessionId`.
  - Early-return if `get().hydrating` is already true.
  - Set `hydrating = true`, clear `hydrationError`.
  - `await queryPagesByUser(sessionId)`, then loop the returned items and
    **`switch (item.sk)`**, with one `case '<pageKey>':` per page that calls
    `get().<pageKey>.apply(item.form)` and `break`.
  - Add a `default` branch with an **exhaustiveness guard**:
    `const _exhaustive: never = item; void _exhaustive`. This makes the compiler
    fail if a `PageKey` is added without a case here — that error is the reminder
    to add the missing case.
  - On success set `hydratedAt`; on error store the message in `hydrationError`;
    in `finally` set `hydrating = false`.

## Rules

- **Do NOT loop `PAGE_KEYS` for the fan-out.** Use an explicit `switch` so the
  `never` guard gives you compile-time exhaustiveness. (Contrast: the session
  slice's `wipeSoftData` DOES loop — different intent.)
- Use `set((s) => { ... })` for every state mutation; `get()` for reads and the
  cross-slice `apply` calls.
- As you add pages in step 4, come back and add each `case` here. Until a page
  slice exists, the switch simply won't reference it.
- Match the surrounding code style; no extra comments beyond the reference.

## Verify

```
npm run build && npx oxlint src && npm run test
```

All green before starting the page slices.
