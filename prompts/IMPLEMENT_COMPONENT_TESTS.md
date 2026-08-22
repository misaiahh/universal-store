# Prompt: Test Hooks & Components That Use the Store

You are writing **component/hook tests** — rendering real React trees that read
the store via `useAppStore` and drive its actions through the UI. Work from the
existing test suite; do not invent new infrastructure.

## Where this fits

These complement the store/slice unit tests (`IMPLEMENT_STORE_TESTS.md`). Those
prove the slice logic in isolation; these prove the **store↔UI wiring**: seeded
state renders, edits stage into the slice, dirty/status drive the UI, and toolbar
buttons call the (mocked) data layer. Write a page's component test after its page
component exists.

## Read the codebase first — do NOT duplicate the example

Study the reference tests and what they render:

- `src/pages/CompanyPage.test.tsx` — **flat-form** page exemplar.
- `src/pages/ProfilePage.test.tsx` — **nested object + dynamic array** exemplar
  (add/remove/edit rows).
- `src/pages/BillingPage.test.tsx`, `PreferencesPage.test.tsx` (non-text controls:
  `<select>`, checkbox), and `src/App.test.tsx` (the shell: tab switching, dirty
  summary/dots, session controls, hydrate-all).
- The corresponding page components (e.g. `src/pages/CompanyPage.tsx`, `App.tsx`)
  to see how they read the store: **atomic selectors by default**
  (`const x = useAppStore((s) => s.<page>.<field>)`) and **`useShallow` for grouped
  reads** (`useAppStore(useShallow((s) => ({ ... })))`) — never a bare
  object-literal selector.
- The harness: `src/test/renderWithStore.ts`, `src/test/setup.ts`,
  `src/test/storeTestUtils.ts`.

Those tests use the example app's pages/fields/labels. **Infer the pattern, not
the specifics.** Assert against THIS app's real components, labels, and controls.

## The harness (reuse it — do NOT rebuild it)

- **No store Provider.** The store is a module singleton (`useAppStore`), so tests
  just render the element. Use `renderWithStore(ui)` from
  `src/test/renderWithStore.ts`, which also re-exports the RTL surface
  (`screen`, `fireEvent`, `within`, `act`, `cleanup`) — import from that one place.
- **Interactions use `fireEvent`** (this project's chosen convention), not
  user-event.
- Global setup (`src/test/setup.ts`) registers jest-dom matchers
  (`toBeInTheDocument`, `toBeDisabled`, `toHaveValue`, …), mocks the async data
  layer, and resets the store + `sessionStorage` before each test and `cleanup()`s
  after. jsdom is the environment.
- Seed state **before** rendering with `seedSession(id?)` and
  `seedPageClean(page, form)` from `storeTestUtils`; read/assert store state with
  `pageState(page)` and `useAppStore.getState()`.

## The core pattern: assert BOTH the UI and the store

A component test's value is proving the wiring in both directions:

- **Store → UI**: seed a clean page, render, assert inputs show the seeded values
  (`getByLabelText(...).toHaveValue(...)`), no dirty badge, Save disabled.
- **UI → store**: `fireEvent.change(getByLabelText('<field>'), { target: { value
  }})`, then assert the slice received it (`pageState('<page>').<field>` and
  `.dirty === true`) **and** the UI reacted (badge shown, Save enabled).
- **Round-trip to clean**: edit back to the hard value → `dirty` false, badge
  gone, Save disabled again.

## What to cover per page

- **Render seeded values** for every field/control (text inputs, `<select>`,
  checkboxes via appropriate matchers/queries).
- **Clean start**: no unsaved badge; Save disabled.
- **Edit → dirty**: staging flips the slice's `dirty` and the UI badge + Save
  button, verified on both sides.
- **Save flow**: `vi.mocked(putPageForm).mockResolvedValue(...)`, click Save,
  assert `toHaveBeenCalledWith(sessionId, '<page>', <form>)`, then
  `await screen.findByText(/Saved at /)` (or your app's saved indicator) and the
  badge clears.
- **Refetch/hydrate flow** (if the page has it): mock `getPageForm`, click, assert
  the server value lands in the input (`await screen.findByDisplayValue(...)`).
- **Dynamic collections** (array pages): Add appends a row (assert row count +
  `pageState` array length + dirty), Remove splices by index, and any empty-state
  hint renders when the collection is emptied.
- **Shell/App-level** (if applicable): default tab, tab switching hides/shows
  headings, editing a non-visible page still updates the header dirty summary +
  tab dot, and session controls (new/switch) update `useAppStore.getState()
  .session` and wipe soft data.

## Rules

- Prefer **role/label queries** (`getByRole`, `getByLabelText`, `getByText`) over
  test ids; use `getAllBy*` for repeated rows.
- Use `findBy*` (async) after any action that awaits a mocked promise; never assert
  post-await UI synchronously.
- Match the reference style and comment density. Do NOT add a Provider wrapper, a
  second store, or user-event.
- **Selector discipline (non-negotiable):** the component under test must read the
  store with **atomic selectors** by default, and any multi-value read must use
  **`useShallow`** — never a bare `useAppStore((s) => ({ ... }))`. If the component
  you're testing violates this, fix the component; a past migration lost hours to
  unwrapped multi-value selectors.

## Verify

```
npm run build && npx oxlint src && npm run test
```

Build, lint (0/0), and all tests green.
