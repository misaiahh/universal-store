# Adding a page slice (pattern reference)

> **READ THIS FIRST — this project is a REFERENCE, not a thing to reproduce.**
>
> The existing pages (`profile`, `company`, `billing`, `preferences`) and their
> seed data (Ada Lovelace, "Analytical Engines Ltd", card `4242 4242 …`) are
> **examples of the pattern**. When you add a page you must use **your own page
> name and your own form fields** — do **not** copy the example pages, their
> field names, or their seed values. Treat them only as a shape to follow.

This app stores one "page" of form data per slice, all under a single Zustand
store. Every page slice follows the **same fixed pattern** (soft form fields
flat on the slice root vs. a hard baseline object, `dirty` tracking, and the
verbs `stage` / `apply` / `hydrate` / `persist` / `reset`). Adding a page =
creating that slice FOLDER with your data and wiring it into the registry, the
root store, and the hydration fan-out.

## Soft vs. hard storage, and the `dirty` flag

This is the core idea every page slice implements. Read it before touching the
template — the verbs below only make sense in these terms.

### Two copies of the form: `soft` (flat) and `hard` (nested)

Each slice keeps **two copies of the same form shape**, stored differently:

- **The SOFT copy — flat fields on the slice root.** The live working draft the
  UI edits, e.g. `s.invoice.number`, `s.invoice.amount`. These fields are spread
  directly onto the slice (via `interface {{Name}}Slice extends {{Name}}Form`),
  so there is **no `.form` wrapper**. They are the ONLY thing written to
  `sessionStorage` (see `partialize` in `appStore.ts`), so they survive a tab
  refresh. Think of them as your uncommitted local edits.
- **`hard` — the HARD copy, ONE nested object.** The last value known to be saved
  in DynamoDB (`s.invoice.hard`). It is **in-memory only** (never persisted) and
  is the baseline the soft fields are measured against. Think of it as "what the
  server currently has". Its keys also double as the field list the helpers use.

Soft is flat but the wire format / dirty check speak in whole-form objects, so
each action bridges them INLINE: it builds a `{{Name}}Form` literal from the flat
soft fields (for dirty/persist/partialize) and assigns a whole-form object back
field-by-field (for apply/hydrate/reset). There is no shared helper — spelling
the fields out means adding a field makes TypeScript flag every action to update.

### `dirty` is per-slice and derived, not stored

Every slice has its **own** `dirty` boolean — there is no global dirty flag. It
is not something you set by hand; it is **recomputed** every time the fields or
the baseline change, as simply:

```ts
// soft is the whole-form literal built from the flat fields; hard is the baseline
dirty = !deepEqual(soft, hard)   // true when soft ≠ hard
```

`deepEqual` (see `src/stores/deepEqual.ts`) recurses into nested objects and
arrays, so `dirty` stays correct for any form shape — flat fields, nested
objects, or arrays of objects — with no manual bookkeeping.

### How a change flows: stage → persist (soft) → hard

1. **Stage (write soft).** The UI calls `stage(...)` (single field or an immer
   recipe). This mutates the flat soft **fields only**, then recomputes
   `dirty = !deepEqual(soft, hard)` (where `soft` is the whole-form literal built
   from the flat fields). Since `hard` is unchanged, staging an edit flips
   `dirty` to `true`; staging it back to the saved value flips it back to `false`
   on its own. Because the soft fields are persisted, the staged change is written
   to `sessionStorage` immediately — "staged" already means "saved locally".
2. **Persist (soft → hard).** `persist()` builds the current soft fields into a
   whole form and sends them to DynamoDB (`putPageForm`), and on success copies
   that value into `hard` and recomputes `dirty` (now `false`, because soft and
   `hard` match). This is the ONLY normal path by which soft edits flow into hard.
3. **Hydrate (server → both).** `hydrate()` fetches the server value and assigns
   it field-by-field to the soft fields **and** `hard`, then clears `dirty` — the
   page starts clean because soft and hard were just made identical.

So: **`stage` moves data into the soft fields (and sessionStorage); `persist` is
what eventually promotes soft into hard.** `dirty` is just the always-current
answer to "do the soft fields differ from hard right now?".

### One subtlety: rehydration after a refresh

On reload, the SOFT fields are restored from `sessionStorage` but `hard` is NOT
(it isn't persisted), so it would default to the empty form and every page would
look dirty. `reconcileHardWithSoft` in `appStore.ts` fixes this by mirroring each
restored soft form into its `hard` (via `apply`), so a reloaded tab starts
**clean** until the next real edit or hydrate. This is why you must add your page
to `reconcileHardWithSoft` in wiring step 3.

## The hydration slice (load ALL pages at once)

There are **two different ways** a page gets its server data, and they are easy to
confuse:

- **Per-page `slice.hydrate()`** — lives on each page slice; refetches **just
  that one page** (`getPageForm(sessionId, '<name>')`). Use it to refresh a
  single page.
- **Top-level `hydrate()`** — lives on the **hydration slice**
  (`src/stores/slices/hydrationSlice.ts`); loads **every page at once**. This is
  the section below.

Unlike the page slices, the hydration slice is **NOT nested** under a key — it
sits at the top level of the store, so its state is `useAppStore.getState()
.hydrating` / `.hydratedAt` / `.hydrationError` (not `store.something.hydrating`).

### What top-level `hydrate()` does

1. **Guard + set status.** If a hydrate is already in flight it returns early;
   otherwise it sets `hydrating = true` and clears `hydrationError`.
2. **One query for all pages.** It calls `queryPagesByUser(sessionId)`, which
   returns **one item per page** (one DynamoDB row per sort key, all under the
   current `session.sessionId`). This is a single round-trip for the whole store,
   not one call per slice.
3. **Fan out to each slice — the "apply" step.** It loops the returned items and
   routes each one to the owning slice by its sort key (`item.sk`), calling that
   slice's **`apply(item.form)`**. (The DynamoDB item still carries a whole-form
   `form` object on the wire; `apply` assigns it field-by-field onto the slice's
   flat soft fields.) Because `apply` sets both the soft fields and `hard` and clears
   `dirty` (see the soft/hard section above), every hydrated page lands **clean**:

   ```ts
   for (const item of items) {
     switch (item.sk) {
       case 'profile':
         get().profile.apply(item.form)
         break
       case 'company':
         get().company.apply(item.form)
         break
       // …one case per page…
       default: {
         // Exhaustiveness guard: if a PageKey has no case, this fails to compile.
         const _exhaustive: never = item
         void _exhaustive
       }
     }
   }
   ```

4. **Finish.** On success it stamps `hydratedAt`; on failure it records
   `hydrationError`; either way `finally` resets `hydrating = false`.

### Why a `switch` (and not a generic loop)

Each `case` is **monomorphic**: inside `case 'company'`, TypeScript knows
`item.form` is a `CompanyForm`, so `company.apply(item.form)` type-checks
exactly. A generic loop would widen `item.form` to a union and break that match.
The `default: const _exhaustive: never = item` line is an **exhaustiveness
check** — add a `PageKey` without adding its `case` and this line fails to
compile, pointing you straight here. That is why routing your new page in the
hydration switch is a required wiring step (step 4 below).

## The two placeholders

Throughout the slice folder you replace exactly two words (same word, different
case):

| Token      | Meaning                          | Example (`Invoice`) |
| ---------- | -------------------------------- | ------------------- |
| `{{Name}}` | PascalCase page name             | `InvoiceForm`, `InvoiceSlice`, `createInvoiceSlice` |
| `{{name}}` | lowercase key (the `PageKey`)    | `s.invoice.number`, `'invoice'` |

Plus your real form fields — defined once in the slice's `types.ts`
(`{{Name}}Form`), defaulted in `constants.ts` (`emptyForm`), and spelled out
inline in each `actions/*.ts`. **Pick a name and fields that describe YOUR
domain.**

## The wiring steps

Adding one page = a new slice FOLDER plus wiring in **3 files** (`pages.ts`,
`appStore.ts`, `hydrationSlice.ts`) and a SEED entry. Missing any step is the
usual failure — do all of them.

### 1. Create the slice folder `src/stores/slices/{{name}}/`

Copy the `company/` folder as your starting point (or follow
`_TEMPLATE_slice.ts.txt`), then replace every `{{Name}}` / `{{name}}` and swap in
YOUR fields throughout. The folder owns everything about the page:

- `types.ts` — **defines `{{Name}}Form`** (use YOUR fields) and the
  `{{Name}}Slice` shape. The form type lives HERE, not in `pages.ts`.
  ```ts
  export interface {{Name}}Form {
    // your real fields, e.g.:  number: string  amount: number  paid: boolean
  }
  ```
- `constants.ts` — `emptyForm: {{Name}}Form` (same keys, empty defaults).
- `slice.ts` — wiring only: initial state + action factory calls.
- `actions/*.ts` — one file per verb (`stage`, `apply`, `hydrate`, `persist`,
  `reset`, `partialize`), each spelling out YOUR field list inline (no
  `gatherForm`/`spreadForm`). `actions/types.ts` derives the `{{Name}}Set` /
  `{{Name}}Get` types.

### 2. `src/stores/pages.ts` (register the key + form type)

- Import your form type from the slice and add it to `PageFormData`:
  ```ts
  import type { {{Name}}Form } from './slices/{{name}}/types'
  // …
  export interface PageFormData {
    profile: ProfileForm
    company: CompanyForm
    billing: BillingForm
    preferences: PreferencesForm
    {{name}}: {{Name}}Form
  }
  ```
- Add your key to `PAGE_KEYS`:
  ```ts
  export const PAGE_KEYS = ['profile', 'company', 'billing', 'preferences', '{{name}}'] as const
  ```

### 3. `src/stores/appStore.ts`

Five edits in this one file:

- **Import** the creator + type:
  ```ts
  import { create{{Name}}Slice, type {{Name}}Slice } from './slices/{{name}}/slice'
  ```
- **Add to the `AppStore` type**:
  ```ts
  export type AppStore = HydrationSlice & {
    // …existing pages…
    {{name}}: {{Name}}Slice
  }
  ```
- **Mount it** in the `immer(...)` creator:
  ```ts
  {{name}}: create{{Name}}Slice(...a),
  ```
- **Add to `partialize`** (the slice owns its persisted shape via its own
  `partialize()` action — the root store just delegates):
  ```ts
  {{name}}: state.{{name}}.partialize(),
  ```
- **Add to `reconcileHardWithSoft`**:
  ```ts
  state.{{name}}.apply(state.{{name}}.partialize())
  ```

### 4. `src/stores/slices/hydrationSlice.ts` (route into the fan-out)

Add a `case` for your page to the `switch` inside top-level `hydrate()`, so the
bulk load applies your page too (see the hydration section above). Place it
before the `default`:

```ts
case '{{name}}':
  get().{{name}}.apply(item.form)
  break
```

Skip this and the `default: const _exhaustive: never = item` guard fails to
compile — which is the type system telling you to add the case here.

### 5. `src/api/schema.ts` (SEED)

Add one entry to `SEED` so `hydrate`/`persist` round-trip. Use YOUR fields and
realistic-but-generic values (NOT the example seeds):

```ts
const SEED: { [K in PageKey]: PageFormData[K] } = {
  // …existing pages…
  {{name}}: {
    // your {{Name}}Form fields with sample values
  },
}
```

### 6. Reading the page in components

No extra wiring — components read the slice directly from the store hook:
```ts
const page = useAppStore((s) => s.{{name}})          // subscribe to the slice
page.stage('fieldA', value)                          // call an action
```
Or, outside React, `useAppStore.getState().{{name}}.stage(...)`.

## Verify

```bash
npm run build   # tsc -b && vite build — must pass
npx oxlint src  # 0 warnings, 0 errors
npm run test    # existing suite stays green
```

If `tsc` complains that a page key is missing somewhere (SEED, `PageFormData`,
`AppStore`, or the hydration `switch`), you skipped one of the wiring steps above
— that is the type system telling you exactly which file to fix.

## Optional: direct `@apollo/client` query actions

If your page also needs a direct GraphQL read (beyond the form round-trip), see
the profile slice's `actions/loadActivity.ts` / `actions/fetchActivity.ts` for
the two patterns:

- **Lazy, updates the store:** run the query, then store the result with
  `structuredClone(data)` — Apollo results are deep-frozen, and immer must own a
  mutable copy or a later recipe mutating it will throw.
- **Returns directly:** a pure async action that returns the data and never
  touches the store (no immer, no clone needed).

Again: copy the *shape* of those actions, not the `ProfileActivity` data.
