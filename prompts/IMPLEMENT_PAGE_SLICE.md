# Prompt: Implement a Page Slice (one at a time)

You are building **ONE page slice folder**. Do this once per page — pick a single
page, complete it end to end (folder + wiring + test + green verification), then
repeat this prompt for the next page. Do NOT try to scaffold all pages at once.

> **Analyze first.** If you are migrating an existing context, run
> `prompts/ANALYZE_EXISTING_CONTEXT.md` before this prompt and implement from its
> plan: the persisted-vs-volatile classification, the Apollo-query→action map, and
> the React-state-hook disposition list define this slice's `{{Name}}Form`, its
> volatile fields, and its actions. Do not start here without that plan.

## Where this fits

This is **step 4 of 4**:

1. Base store ✅ (`appStore.ts` + `pages.ts`)
2. Session slice ✅
3. Hydration slice ✅
4. **Page slice** ← _you are here_ (repeat per page)

## Read the codebase first — do NOT duplicate the example

Study the reference page-slice folder (e.g. `src/stores/slices/company/`), the
template `src/stores/slices/_TEMPLATE_slice.ts.txt`, and the guide
`docs/ADD_A_PAGE.md`. Those use placeholder tokens `{{Name}}` / `{{name}}` and an
example domain (company name, industry, employees, etc.).

**The example fields are NOT your fields.** Infer the *structure and principles*
and apply them to THIS page's real domain. Determine this page's actual form
fields from whatever source of truth this app has (existing UI, API schema, ticket
/ spec). If unsure what the fields are, ask — do not invent a placeholder shape.

## The soft / hard / dirty model (apply, don't reinvent)

- **Soft** = the live editable fields, spread **FLAT on the slice root** (e.g.
  `s.<name>.someField`) via `interface {{Name}}Slice extends {{Name}}Form`.
  There is **no `.form` wrapper**. Soft is the only thing persisted.
- **hard** = ONE nested object (`s.<name>.hard`) holding the last-saved baseline.
  In-memory only, never persisted.
- **dirty** = `!deepEqual(soft, hard)`, recomputed whenever soft changes.

Soft is flat but the wire format / dirty check speak in whole-form objects, so
each action **bridges inline**: it builds a `{{Name}}Form` literal from the flat
soft fields, and assigns whole-form objects back field-by-field. Spell out every
field explicitly — no `gatherForm`/`spreadForm` helpers. This is deliberate: a new
field on the form makes TypeScript flag every action that forgot to handle it.

## Files to produce — `src/stores/slices/<name>/`

- **`types.ts`** — defines **`{{Name}}Form`** (this page's real fields; OWNED
  here, imported by `pages.ts`) and the `{{Name}}Slice` shape
  (`extends {{Name}}Form` + `hard`, `dirty`, `saving`, `savedAt`, `hydrating`, and
  the action signatures).
- **`constants.ts`** — `emptyForm: {{Name}}Form` with the same keys, each at its
  empty default.
- **`actions/types.ts`** — derive `{{Name}}Set` / `{{Name}}Get` from a
  `StateCreator<AppStore, [['zustand/immer', never]], [], unknown>` via
  `Parameters<...>[0]` / `[1]`.
- **`actions/stage.ts`** — a `Stage` overload: `(key, value)` OR `(recipe)`; after
  mutating, rebuild the soft literal and set `dirty = !deepEqual(soft, hard)`.
- **`actions/apply.ts`** — write each field from the given form, set `hard = form`,
  `dirty = false` (the clean-baseline setter used by hydration + rehydrate).
- **`actions/hydrate.ts`** — per-page load: set `hydrating`, `getPageForm(sessionId,
  '<name>')`, copy fields in, set `hard`, clear `dirty`, unset `hydrating` in
  `finally`.
- **`actions/persist.ts`** — set `saving`, build the saved form literal,
  `putPageForm(sessionId, '<name>', saved)`, update `hard`, recompute `dirty`, set
  `savedAt`, unset `saving` in `finally`.
- **`actions/reset.ts`** — set every soft field to `emptyForm.<field>`, `hard =
  emptyForm`, clear `dirty`/`saving`/`hydrating`, `savedAt = null`.
- **`actions/partialize.ts`** — return the soft fields as a `{{Name}}Form` (the
  persisted shape this slice owns).
- **`slice.ts`** — wiring only: spread `emptyForm`, initial `hard`/status fields,
  and assign each action via its `create*` factory. Re-export `{{Name}}Slice`.

If this page needs extra behavior (e.g. a direct Apollo query like the reference
profile slice's `loadActivity`/`fetchActivity`), add matching `actions/*.ts` files
and own any new types in this slice's `types.ts`. Remember Apollo results are
deep-frozen — `structuredClone` before storing anything in immer.

## Touching another slice — call its action, never mutate it

If an action here must read or drive ANOTHER slice, do it through `get()`, which is
typed against the whole `AppStore` (that's why `actions/types.ts` derives from
`StateCreator<AppStore, …>`):

- **READ another slice's data** with `get().<other>.<value>` — e.g. `persist`/
  `hydrate` scope to `get().session.sessionId`. Read it at call time; do not copy
  it into this slice's state.
- **WRITE another slice by calling its ACTION**, never by mutating its fields:
  ```ts
  get().billing.stage('billingZip', zip)   // ✅ drive billing through its action
  // ❌ set((s) => { s.billing.billingZip = zip })  — skips billing's dirty/hard rules
  ```
  The reference orchestrators do exactly this: `sessionSlice.wipeSoftData()` calls
  `get()[key].reset()`; `hydrate()` calls `get().<page>.apply(form)`.

A view that needs to drive another slice does the same indirectly — it calls one
action (e.g. `resetSession()`, `hydrate()`) and lets THAT action own the fan-out;
the component never reaches into another slice's fields.

## Wire the page in (see docs/ADD_A_PAGE.md for the full checklist)

1. `pages.ts` — add the key to `PAGE_KEYS`; import `{{Name}}Form` and add it to
   `PageFormData`.
2. `appStore.ts` — import `create{{Name}}Slice` + type; add to `AppStore`; mount
   in the creator; add to `partialize`; add to `reconcileHardWithSoft`.
3. `hydrationSlice.ts` — add the `case '<name>': get().<name>.apply(item.form)`
   (the `never` guard will otherwise fail to compile).
4. The app's API SEED / schema — add a realistic-but-generic entry for this page
   so hydrate/persist round-trip. Use YOUR fields, NOT the example seeds.

## Test it

Follow the reference slice test (e.g. `company/slice.test.ts`) and the helpers in
`src/test/storeTestUtils.ts` (`seedSession`, `seedPageClean`, `pageState`,
`pageForm`). Cover stage (key + recipe, dirty flip/clear, hard untouched),
persist (success + rejection resets `saving`), hydrate (server form becomes clean
baseline), and reset. Do NOT create new test infrastructure — reuse what exists.

## Verify

```
npm run build && npx oxlint src && npm run test
```

Build, lint (0/0), and all tests green **before** you start the next page.
