import type { Stage } from './actions/stage'

// The company page's form values — the ONLY fields persisted and the shape
// DynamoDB items carry under their `form` attribute. Owned by this slice; the
// central registry (stores/pages.ts) imports it to build PageFormData.
export interface CompanyForm {
  companyName: string
  industry: string
  employees: number
}

// Public SHAPE of the company slice, kept separate from its DEFINITION
// (slice.ts) and its ACTIONS (./actions). slice.ts re-exports this so existing
// `from './slices/company/slice'` imports keep working.
//
// The slice is NESTED under the `company` key on the store. It owns:
//   - its SOFT form fields (companyName, industry, employees) directly on the
//     slice root (edited in the UI, persisted to sessionStorage).
//   - `hard`  : the last value known to be in DynamoDB, kept as ONE nested
//     object (in-memory only, NOT persisted) — the baseline soft is compared
//     against.
//   - `dirty` : whether soft ≠ hard, i.e. there are unsaved edits.
// Plus load/save status and DynamoDB actions (see ./actions for behaviour).
export interface CompanySlice extends CompanyForm {
  hard: CompanyForm
  dirty: boolean
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  // Soft-write into this page's fields and recompute dirty. Named `stage`
  // (git-like: stage a change, then `persist()` commits it to DynamoDB). Two
  // forms: set one field, or mutate the draft fields directly (multi-field).
  // Because every slice's actions live on the global store, ANOTHER page can call
  // store.company.stage(...) to stage a change here; leaving it un-persisted just
  // marks this page dirty so the user can come back and persist it.
  stage: Stage
  apply: (form: CompanyForm) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  reset: () => void
  // Return the flat SOFT fields as a whole CompanyForm. The root store calls this
  // to know what to persist to sessionStorage (and what to reconcile back into
  // `hard` on reload), so the slice owns its own persisted shape.
  partialize: () => CompanyForm
}
