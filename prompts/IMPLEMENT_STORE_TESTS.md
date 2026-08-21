# Prompt: Test the Store & Slices

You are writing **unit tests for the store and its slices themselves** — no React,
no components. Exercise the store through its vanilla API exactly as the app's
hooks do. Work from the existing test suite; do not invent new infrastructure.

## Where this fits

These tests pair with the implementation prompts (base store → session →
hydration → page slices). Write a slice's tests **right after you implement that
slice**, before moving to the next. Component/hook tests are a separate prompt
(`IMPLEMENT_COMPONENT_TESTS.md`).

## Read the codebase first — do NOT duplicate the example

Study the reference tests before writing anything:

- `src/stores/slices/company/slice.test.ts` — the **flat-slice** exemplar.
- `src/stores/slices/profile/slice.test.ts` — the **nested-object + array** exemplar.
- `src/stores/slices/sessionSlice.test.ts`, `hydrationSlice.test.ts`,
  `src/stores/appStore.test.ts`, `src/stores/deepEqual.test.ts`.
- The shared harness: `src/test/setup.ts`, `src/test/storeTestUtils.ts`, and the
  `test` block in `vite.config.ts`.

Those tests use the example app's pages/fields. **Infer the pattern, not the
fields.** Assert against THIS app's real slices and form shapes.

## Why per-file action factories make this easy (call this out)

Each slice defines its verbs (`stage`, `apply`, `hydrate`, `persist`, `reset`,
`partialize`, …) as **standalone factory functions in their own `actions/*.ts`
files**, wired together in `slice.ts`. That structure is a testing advantage:

- Each action has **one clear responsibility**, so a test targets exactly one
  behavior (e.g. "stage flips dirty", "persist clears dirty + sets savedAt").
- Actions are invoked through the live store (`pageState('<page>').stage(...)`),
  so you test the real immer/persist middleware chain — but because each verb is
  isolated, failures point at a single small file, not a monolithic slice.
- Adding a verb = adding one action file + one focused `describe` block. You never
  have to untangle unrelated logic to test a new behavior.

Keep tests organized the same way: **one `describe` per action**, mirroring the
one-file-per-action layout.

## The harness (reuse it — do NOT rebuild it)

- The **live `useAppStore`** is the single source of truth. Never construct a
  throwaway store; tests must exercise the real `persist(immer(...))` chain.
- Global setup (`src/test/setup.ts`) already: mocks the async data layer
  (`dynamoClient`, and the direct-query module) with `vi.fn()`, runs
  `vi.clearAllMocks()`, `sessionStorage.clear()`, and `resetAppStore()` before
  each test, and cleans up after. **The data-layer mock MUST stay in `setup.ts`**
  — the store is imported transitively during setup, so a per-file `vi.mock` is
  silently ignored once the module is cached.
- Helpers in `src/test/storeTestUtils.ts`: `resetAppStore()`, `seedSession(id?)`,
  `seedPageClean(page, form)` (sets soft + hard to the same value → clean),
  `pageState(page)` (read slice state/actions), `pageForm(page)` (gather soft
  fields into a whole-form object), and a `PAGE_KEYS` re-export.

## What to cover per slice

- **`beforeEach`**: `seedSession()`, then `seedPageClean('<page>', HARD)` for a
  known clean baseline (deep-clone HARD for nested/array forms).
- **`stage(key, value)`**: writes one field; flips `dirty` when it differs from
  `hard`; **clears** `dirty` when edited back to the hard value; never mutates
  `hard`.
- **`stage(recipe)`**: multi-field / nested / array edits (`push`/`splice`/index)
  in a single dirty recompute; dirty clears when the deep value returns to hard.
- **`persist`**: `vi.mocked(putPageForm).mockResolvedValue(...)`, assert
  `toHaveBeenCalledWith(sessionId, '<page>', <form>)`, then `hard` updated,
  `dirty` false, `savedAt` set. Rejection path: `await expect(...).rejects
  .toThrow(...)` AND the `saving` flag resets.
- **`hydrate`**: mock `getPageForm`, assert the server form becomes the new clean
  baseline (soft === hard, dirty false).
- **`reset`**: soft + hard back to `emptyForm`, status flags cleared, `savedAt`
  null.
- **Session/hydration/registry slices** (if you touched them): session
  mint/change/reset + `wipeSoftData` loops every page; hydration fans items to
  each slice via the exhaustive switch, records `hydratedAt`/`hydrationError`, and
  is re-entrancy guarded; `deepEqual` covers primitives/nested/arrays if changed.

## Rules

- Assert **observable effects** (mocked data-layer calls, resulting state), not
  internal spies on store methods (immer state is non-configurable).
- Use `structuredClone` for nested/array fixtures so a test can't mutate shared
  data.
- Match the reference style and comment density. Do NOT create new test utilities
  or a second store instance.

## Verify

```
npm run build && npx oxlint src && npm run test
```

Build, lint (0/0), and all tests green.
