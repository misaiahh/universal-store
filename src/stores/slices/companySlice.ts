import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { CompanyForm } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'
import { deepEqual } from '../deepEqual'

// Company page slice — NESTED under the `company` key. Owns `form` (SOFT working
// copy, persisted to sessionStorage), `hard` (last known DynamoDB value,
// in-memory only), and `dirty` (soft ≠ hard, i.e. unsaved edits). Plus load/save
// status and DynamoDB actions: `applyForm` (set from an already-fetched item),
// `hydrate()` (refetch just this page), `persist()` (hard-save just this page),
// and `reset()` (wipe soft+hard on a session change). Keyed by the current
// session.sessionId.
export interface CompanySlice {
  form: CompanyForm
  hard: CompanyForm
  dirty: boolean
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  // Soft-write into this page's working copy and recompute dirty. Named `stage`
  // (git-like: stage a change, then `persist()` commits it to DynamoDB). Two
  // forms: set one field, or mutate the draft form directly (nested/multi-field).
  // Because every slice's actions live on the global store, ANOTHER page can call
  // store.company.stage(...) to stage a change here; leaving it un-persisted just
  // marks this page dirty so the user can come back and persist it.
  stage: {
    <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]): void
    (recipe: (draft: CompanyForm) => void): void
  }
  applyForm: (form: CompanyForm) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  reset: () => void
}

const emptyForm: CompanyForm = {
  companyName: '',
  industry: '',
  employees: 0,
}

export const createCompanySlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  CompanySlice
> = (set, get) => ({
  form: emptyForm,
  hard: emptyForm,
  dirty: false,
  saving: false,
  savedAt: null,
  hydrating: false,

  stage: (
    keyOrRecipe: keyof CompanyForm | ((draft: CompanyForm) => void),
    value?: CompanyForm[keyof CompanyForm],
  ) =>
    set((s) => {
      if (typeof keyOrRecipe === 'function') {
        keyOrRecipe(s.company.form)
      } else {
        // Dynamic single-field write. Indexing the draft with a union key
        // narrows the target to `never`, so assign through an unknown-valued
        // record; the public overload keeps callers fully type-checked.
        ;(s.company.form as Record<string, unknown>)[keyOrRecipe] = value
      }
      s.company.dirty = !deepEqual(s.company.form, s.company.hard)
    }),

  applyForm: (form) =>
    set((s) => {
      s.company.form = form
      s.company.hard = form
      s.company.dirty = false
    }),

  hydrate: async () => {
    set((s) => {
      s.company.hydrating = true
    })
    try {
      const item = await getPageForm(get().session.sessionId, 'company')
      set((s) => {
        s.company.form = item.form
        s.company.hard = item.form
        s.company.dirty = false
      })
    } finally {
      set((s) => {
        s.company.hydrating = false
      })
    }
  },

  persist: async () => {
    set((s) => {
      s.company.saving = true
    })
    try {
      const saved = get().company.form
      await putPageForm(get().session.sessionId, 'company', saved)
      set((s) => {
        s.company.hard = saved
        s.company.dirty = !deepEqual(s.company.form, saved)
        s.company.savedAt = new Date().toISOString()
      })
    } finally {
      set((s) => {
        s.company.saving = false
      })
    }
  },

  reset: () =>
    set((s) => {
      s.company.form = emptyForm
      s.company.hard = emptyForm
      s.company.dirty = false
      s.company.saving = false
      s.company.savedAt = null
      s.company.hydrating = false
    }),
})
