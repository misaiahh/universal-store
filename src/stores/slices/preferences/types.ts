import type { Stage } from './actions/stage'

// The preferences page's form values — the ONLY fields persisted and the shape
// DynamoDB items carry under their `form` attribute. Owned by this slice; the
// central registry (stores/pages.ts) imports it to build PageFormData.
export interface PreferencesForm {
  theme: 'light' | 'dark'
  newsletter: boolean
  language: string
}

// Public SHAPE of the preferences slice, kept separate from its DEFINITION
// (slice.ts) and its ACTIONS (./actions). slice.ts re-exports this so existing
// `from './slices/preferences/slice'` imports keep working.
//
// The slice is NESTED under the `preferences` key on the store. It owns:
//   - its SOFT form fields (theme, newsletter, language) directly on the slice
//     root (edited in the UI, persisted to sessionStorage).
//   - `hard`  : the last value known to be in DynamoDB, kept as ONE nested
//     object (in-memory only, NOT persisted) — the baseline soft is compared
//     against.
//   - `dirty` : whether soft ≠ hard, i.e. there are unsaved edits.
// Plus load/save status and DynamoDB actions (see ./actions for behaviour).
export interface PreferencesSlice extends PreferencesForm {
  hard: PreferencesForm
  dirty: boolean
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  // Soft-write into this page's fields and recompute dirty. Named `stage`
  // (git-like: stage a change, then `persist()` commits it to DynamoDB). Two
  // forms: set one field, or mutate the draft fields directly (multi-field).
  // Because every slice's actions live on the global store, ANOTHER page can call
  // store.preferences.stage(...) to stage a change here; leaving it un-persisted
  // just marks this page dirty so the user can come back and persist it.
  stage: Stage
  apply: (form: PreferencesForm) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  reset: () => void
  // Return the flat SOFT fields as a whole PreferencesForm. The root store calls
  // this to know what to persist to sessionStorage (and what to reconcile back
  // into `hard` on reload), so the slice owns its own persisted shape.
  partialize: () => PreferencesForm
}
