import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { PreferencesForm } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'
import { deepEqual } from '../deepEqual'

// Preferences page slice — NESTED under the `preferences` key. Owns `form` (SOFT
// working copy, persisted to sessionStorage), `hard` (last known DynamoDB value,
// in-memory only), and `dirty` (soft ≠ hard, i.e. unsaved edits). Plus load/save
// status and DynamoDB actions: `applyForm` (set from an already-fetched item),
// `hydrate()` (refetch just this page), `persist()` (hard-save just this page),
// and `reset()` (wipe soft+hard on a session change). Keyed by the current
// session.sessionId.
export interface PreferencesSlice {
  form: PreferencesForm
  hard: PreferencesForm
  dirty: boolean
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  // Soft-write into this page's working copy and recompute dirty. Named `stage`
  // (git-like: stage a change, then `persist()` commits it to DynamoDB). Two
  // forms: set one field, or mutate the draft form directly (nested/multi-field).
  // Because every slice's actions live on the global store, ANOTHER page can call
  // store.preferences.stage(...) to stage a change here; leaving it un-persisted
  // just marks this page dirty so the user can come back and persist it.
  stage: {
    <K extends keyof PreferencesForm>(key: K, value: PreferencesForm[K]): void
    (recipe: (draft: PreferencesForm) => void): void
  }
  applyForm: (form: PreferencesForm) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  reset: () => void
}

const emptyForm: PreferencesForm = {
  theme: 'light',
  newsletter: false,
  language: 'en',
}

export const createPreferencesSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  PreferencesSlice
> = (set, get) => ({
  form: emptyForm,
  hard: emptyForm,
  dirty: false,
  saving: false,
  savedAt: null,
  hydrating: false,

  stage: (
    keyOrRecipe: keyof PreferencesForm | ((draft: PreferencesForm) => void),
    value?: PreferencesForm[keyof PreferencesForm],
  ) =>
    set((s) => {
      if (typeof keyOrRecipe === 'function') {
        keyOrRecipe(s.preferences.form)
      } else {
        // Dynamic single-field write. Indexing the draft with a union key
        // narrows the target to `never`, so assign through an unknown-valued
        // record; the public overload keeps callers fully type-checked.
        ;(s.preferences.form as Record<string, unknown>)[keyOrRecipe] = value
      }
      s.preferences.dirty = !deepEqual(s.preferences.form, s.preferences.hard)
    }),

  applyForm: (form) =>
    set((s) => {
      s.preferences.form = form
      s.preferences.hard = form
      s.preferences.dirty = false
    }),

  hydrate: async () => {
    set((s) => {
      s.preferences.hydrating = true
    })
    try {
      const item = await getPageForm(get().session.sessionId, 'preferences')
      set((s) => {
        s.preferences.form = item.form
        s.preferences.hard = item.form
        s.preferences.dirty = false
      })
    } finally {
      set((s) => {
        s.preferences.hydrating = false
      })
    }
  },

  persist: async () => {
    set((s) => {
      s.preferences.saving = true
    })
    try {
      const saved = get().preferences.form
      await putPageForm(get().session.sessionId, 'preferences', saved)
      set((s) => {
        s.preferences.hard = saved
        s.preferences.dirty = !deepEqual(s.preferences.form, saved)
        s.preferences.savedAt = new Date().toISOString()
      })
    } finally {
      set((s) => {
        s.preferences.saving = false
      })
    }
  },

  reset: () =>
    set((s) => {
      s.preferences.form = emptyForm
      s.preferences.hard = emptyForm
      s.preferences.dirty = false
      s.preferences.saving = false
      s.preferences.savedAt = null
      s.preferences.hydrating = false
    }),
})
