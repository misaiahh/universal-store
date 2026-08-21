import type { Stage } from './actions/stage'

// The profile page's form values — the ONLY fields persisted and the shape
// DynamoDB items carry under their `form` attribute. Owned by this slice; the
// central registry (stores/pages.ts) imports it to build PageFormData.
//
// Profile intentionally models the two non-flat shapes a form can grow into: a
// nested OBJECT (`address`) and an ARRAY of objects (`phones`). deepEqual already
// recurses into both, so `dirty` is correct; the slice's immer-based setters are
// what make editing them ergonomic.
export interface Address {
  street: string
  city: string
  zip: string
}

export interface Phone {
  label: string
  number: string
}

export interface ProfileForm {
  fullName: string
  email: string
  address: Address
  phones: Phone[]
}

// Read-only enrichment for the profile page, fetched via a direct @apollo/client
// query (NOT part of the DynamoDB single-table form model). It is intentionally
// DEEPLY NESTED — a summary object plus an array of events each carrying its own
// metadata object — so it exercises the immer-vs-frozen-Apollo-result issue: the
// query result is a frozen, deeply nested tree, and immer can only take
// ownership of a structuredClone of it.
export interface ActivityMetadata {
  ip: string
  device: string
  location: string
}

export interface ActivityEvent {
  id: string
  kind: string
  at: string
  metadata: ActivityMetadata
}

export interface ActivitySummary {
  totalEvents: number
  lastSeen: string
  topKind: string
}

export interface ProfileActivity {
  summary: ActivitySummary
  events: ActivityEvent[]
}

// Public SHAPE of the profile slice, kept separate from its DEFINITION
// (slice.ts) and its ACTIONS (./actions). slice.ts re-exports this so existing
// `from './slices/profile/slice'` imports keep working.
//
// The slice is NESTED under the `profile` key on the store. It owns:
//   - its SOFT form fields (fullName, email, address, phones) directly on the
//     slice root (edited in the UI, persisted to sessionStorage).
//   - `hard`  : the last value known to be in DynamoDB, kept as ONE nested
//     object (in-memory only, NOT persisted) — the baseline soft is compared
//     against.
//   - `dirty` : whether soft ≠ hard, i.e. there are unsaved edits.
// Plus load/save status and DynamoDB actions (see ./actions for behaviour).
export interface ProfileSlice extends ProfileForm {
  hard: ProfileForm
  dirty: boolean
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  // Soft-write into this page's fields and recompute dirty. Named `stage`
  // (git-like: stage a change, then `persist()` commits it to DynamoDB). Two
  // forms: set one top-level field, or mutate the draft fields directly for
  // nested objects (`address`), arrays (`phones`), or multi-field changes:
  //   stage('email', v)
  //   stage((d) => { d.address.city = v })
  //   stage((d) => { d.phones.push({ label: '', number: '' }) })
  // Because every slice's actions live on the global store, ANOTHER page can call
  // store.profile.stage(...) to stage a change here; leaving it un-persisted just
  // marks this page dirty so the user can come back and persist it.
  stage: Stage
  apply: (form: ProfileForm) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  reset: () => void
  // Return the flat SOFT fields as a whole ProfileForm. The root store calls this
  // to know what to persist to sessionStorage (and what to reconcile back into
  // `hard` on reload), so the slice owns its own persisted shape.
  partialize: () => ProfileForm

  // --- Direct @apollo/client query examples (read-only profile enrichment) ---
  // These are NOT part of the soft/hard/dirty form model above; they demonstrate
  // the two ways a GraphQL query is wired against an immer store. Both hit the
  // same `profileActivity` query, whose result Apollo deep-FREEZES.
  //
  // The returned tree being frozen is the whole point: immer's `set` can store a
  // frozen object as an opaque leaf, but the moment a later recipe tries to MUTATE
  // that stored subtree in place (e.g. push an event, edit metadata) immer throws,
  // because it never took ownership of a frozen foreign object. So anything we
  // want to keep in the draft AND remain mutable must be structuredClone'd first.
  activity: ProfileActivity | null
  activityLoading: boolean
  activityError: string | null
  // Type 1 — LAZY, side-effecting. A component/hook triggers it; it drives
  // activityLoading/activityError and writes the result INTO the store. The
  // Apollo result is structuredClone'd so immer owns a mutable copy that future
  // `stage`-style recipes can safely mutate. Returns nothing.
  loadActivity: () => Promise<void>
  // Type 2 — RETURNS DIRECTLY. A pure async read: it performs the query and hands
  // the (frozen) Apollo result straight back to the caller. It touches the store
  // not at all, so there is no immer interaction and nothing to clone here —
  // the caller owns whatever it does with the frozen tree.
  fetchActivity: () => Promise<ProfileActivity>
}
