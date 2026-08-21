# Prompt: Implement the Base Store

You are building the **root of a Zustand store** for THIS application. Work from
what already exists in the codebase — do not invent a shape or copy the example
app's pages verbatim.

## Order of the whole build

This is **step 1 of 4**. Build in this order, one prompt per step:

1. **Base store** ← _you are here_ (`appStore.ts` + `pages.ts` registry)
2. Session slice (`IMPLEMENT_SESSION_SLICE.md`)
3. Hydration slice (`IMPLEMENT_HYDRATION_SLICE.md`)
4. Each page slice, **one at a time** (`IMPLEMENT_PAGE_SLICE.md`)

The base store references the session/hydration/page slices, so you will scaffold
its types/wiring now and fill in the slice imports as you complete steps 2–4.

## Read the codebase first — do NOT duplicate the example

Before writing anything, study the reference implementation in
`src/stores/` (`appStore.ts`, `pages.ts`, `slices/`) and the guide
`docs/ADD_A_PAGE.md` + `src/stores/slices/_TEMPLATE_slice.ts.txt`.

Those files use placeholder tokens `{{Name}}` (PascalCase) / `{{name}}`
(lowercase key) and an example set of pages (profile/company/billing/preferences).
**Those pages are illustrative only.** Infer the *pattern and principles* and
apply them to THIS app's real domain — its actual page keys, its actual form
fields, its actual API layer. If the reference and this app disagree, THIS app
wins.

## What to produce

### `src/stores/pages.ts` — the thin registry

- `PAGE_KEYS` — a `readonly` tuple (`as const`) of this app's lowercase page keys.
  Keep it a tuple, not a string union, so switches can be exhaustiveness-checked.
- `PageKey = (typeof PAGE_KEYS)[number]` — also the DynamoDB sort key.
- `PageFormData` — an interface mapping each `PageKey` to its `*Form` type.
  **Import each `*Form` from its own slice's `types.ts`** — the registry does not
  define form shapes, it only composes them.

### `src/stores/appStore.ts` — the composed store

Mirror the reference structure, adapted to this app:

- **`AppStore` type**: `HydrationSlice & { session: SessionSlice; <eachPage>: <Page>Slice }`.
  Hydration is spread at the top level; session and every page nest under a key.
- **Middleware stack**: `create<AppStore>()(persist(immer((...a) => ({ ... }))))`.
  immer wraps the creators; persist overlays sessionStorage on top.
- **Creator body**: spread `createHydrationSlice(...a)` and `createSessionSlice(...a)`,
  then `<pageKey>: create<Page>Slice(...a)` for every page.
- **`partialize(state)`**: return only the SOFT/persisted data —
  `{ session: { sessionId: state.session.sessionId }, <pageKey>: state.<pageKey>.partialize(), ... }`.
  Each slice owns its own persisted shape via its `partialize()` action; the root
  just delegates.
- **`reconcileHardWithSoft(state)`**: for every page call
  `state.<pageKey>.apply(state.<pageKey>.partialize())` so the rehydrated soft
  fields become the clean hard baseline.
- **persist options**: `name`, `storage: createJSONStorage(() => sessionStorage)`,
  `version`, `partialize`, a `merge` using `@fastify/deepmerge` (configure it to
  **replace** arrays via `mergeArray` → clone source, `all: true`), and
  `onRehydrateStorage: () => (state) => { if (!state) return; state.session.ensureSession(); reconcileHardWithSoft(state) }`.
- **Trailing call**: `useAppStore.getState().session.ensureSession()` to guard the
  first-ever load (empty sessionStorage).

## Rules

- **Explicit over generic.** Spell out each page in `partialize`,
  `reconcileHardWithSoft`, and the creator body — no loops over `PAGE_KEYS` here.
- **Type-only imports** for the slice `*Slice` / `*Form` types to avoid cycles.
- If a page slice doesn't exist yet, leave a clearly-marked TODO for its import +
  wiring line and fill it in when you implement that slice in step 4. The store
  must still type-check for the slices that DO exist.
- Match the surrounding code style. Do not add explanatory comments beyond what
  the reference files already demonstrate.

## Verify

Run the project's own verification (see `package.json`):

```
npm run build && npx oxlint src && npm run test
```

Build, lint (0/0), and the existing tests must stay green before you move to the
session slice.
