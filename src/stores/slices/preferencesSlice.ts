import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { PreferencesForm } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'

// Preferences page slice — NESTED under the `preferences` key. Form values, a
// field setter, load/save status, and the DynamoDB actions: `applyForm` (set
// from an already-fetched item), `hydrate()` (refetch just this page),
// `persist()` (hard-save just this page), and `reset()` (wipe this page's soft
// data on a session change). Keyed by the current session.sessionId.
export interface PreferencesSlice {
  form: PreferencesForm
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  setField: <K extends keyof PreferencesForm>(
    key: K,
    value: PreferencesForm[K],
  ) => void
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
  [],
  [],
  PreferencesSlice
> = (set, get) => ({
  form: emptyForm,
  saving: false,
  savedAt: null,
  hydrating: false,

  setField: (key, value) =>
    set((s) => ({
      preferences: {
        ...s.preferences,
        form: { ...s.preferences.form, [key]: value },
      },
    })),

  applyForm: (form) =>
    set((s) => ({ preferences: { ...s.preferences, form } })),

  hydrate: async () => {
    set((s) => ({ preferences: { ...s.preferences, hydrating: true } }))
    try {
      const item = await getPageForm(get().session.sessionId, 'preferences')
      set((s) => ({ preferences: { ...s.preferences, form: item.form } }))
    } finally {
      set((s) => ({ preferences: { ...s.preferences, hydrating: false } }))
    }
  },

  persist: async () => {
    set((s) => ({ preferences: { ...s.preferences, saving: true } }))
    try {
      await putPageForm(
        get().session.sessionId,
        'preferences',
        get().preferences.form,
      )
      set((s) => ({
        preferences: { ...s.preferences, savedAt: new Date().toISOString() },
      }))
    } finally {
      set((s) => ({ preferences: { ...s.preferences, saving: false } }))
    }
  },

  reset: () =>
    set((s) => ({
      preferences: {
        ...s.preferences,
        form: emptyForm,
        saving: false,
        savedAt: null,
        hydrating: false,
      },
    })),
})
