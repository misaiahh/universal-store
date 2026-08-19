import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { BillingForm } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'
import { deepEqual } from '../deepEqual'

// Billing page slice — NESTED under the `billing` key. Owns `form` (SOFT working
// copy, persisted to sessionStorage), `hard` (last known DynamoDB value,
// in-memory only), and `dirty` (soft ≠ hard, i.e. unsaved edits). Plus load/save
// status and DynamoDB actions: `applyForm` (set from an already-fetched item),
// `hydrate()` (refetch just this page), `persist()` (hard-save just this page),
// and `reset()` (wipe soft+hard on a session change). Keyed by the current
// session.sessionId.
export interface BillingSlice {
  form: BillingForm
  hard: BillingForm
  dirty: boolean
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  // Soft-write into this page's working copy and recompute dirty. Named `stage`
  // (git-like: stage a change, then `persist()` commits it to DynamoDB). Two
  // forms: set one field, or mutate the draft form directly (nested/multi-field).
  // Because every slice's actions live on the global store, ANOTHER page can call
  // store.billing.stage(...) to stage a change here; leaving it un-persisted just
  // marks this page dirty so the user can come back and persist it.
  stage: {
    <K extends keyof BillingForm>(key: K, value: BillingForm[K]): void
    (recipe: (draft: BillingForm) => void): void
  }
  applyForm: (form: BillingForm) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  reset: () => void
}

const emptyForm: BillingForm = {
  cardName: '',
  cardNumber: '',
  billingZip: '',
}

export const createBillingSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  BillingSlice
> = (set, get) => ({
  form: emptyForm,
  hard: emptyForm,
  dirty: false,
  saving: false,
  savedAt: null,
  hydrating: false,

  stage: (
    keyOrRecipe: keyof BillingForm | ((draft: BillingForm) => void),
    value?: BillingForm[keyof BillingForm],
  ) =>
    set((s) => {
      if (typeof keyOrRecipe === 'function') {
        keyOrRecipe(s.billing.form)
      } else {
        // Dynamic single-field write. Indexing the draft with a union key
        // narrows the target to `never`, so assign through an unknown-valued
        // record; the public overload keeps callers fully type-checked.
        ;(s.billing.form as Record<string, unknown>)[keyOrRecipe] = value
      }
      s.billing.dirty = !deepEqual(s.billing.form, s.billing.hard)
    }),

  applyForm: (form) =>
    set((s) => {
      s.billing.form = form
      s.billing.hard = form
      s.billing.dirty = false
    }),

  hydrate: async () => {
    set((s) => {
      s.billing.hydrating = true
    })
    try {
      const item = await getPageForm(get().session.sessionId, 'billing')
      set((s) => {
        s.billing.form = item.form
        s.billing.hard = item.form
        s.billing.dirty = false
      })
    } finally {
      set((s) => {
        s.billing.hydrating = false
      })
    }
  },

  persist: async () => {
    set((s) => {
      s.billing.saving = true
    })
    try {
      const saved = get().billing.form
      await putPageForm(get().session.sessionId, 'billing', saved)
      set((s) => {
        s.billing.hard = saved
        s.billing.dirty = !deepEqual(s.billing.form, saved)
        s.billing.savedAt = new Date().toISOString()
      })
    } finally {
      set((s) => {
        s.billing.saving = false
      })
    }
  },

  reset: () =>
    set((s) => {
      s.billing.form = emptyForm
      s.billing.hard = emptyForm
      s.billing.dirty = false
      s.billing.saving = false
      s.billing.savedAt = null
      s.billing.hydrating = false
    }),
})
