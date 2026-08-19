import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { ProfileForm } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'

// Profile page slice — NESTED under the `profile` key on the store. It owns its
// form values, a generic field setter, load/save status, and DynamoDB actions:
// `applyForm` (set from an already-fetched item, used by the top-level bulk
// hydrate), `hydrate()` (refetch JUST this page), `persist()` (hard-save JUST
// this page), and `reset()` (wipe this page's soft data back to defaults; called
// when the session changes). DynamoDB reads/writes are keyed by the current
// session.sessionId (the table's primary key).
export interface ProfileSlice {
  form: ProfileForm
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  setField: <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => void
  applyForm: (form: ProfileForm) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  reset: () => void
}

const emptyForm: ProfileForm = {
  fullName: '',
  email: '',
  phone: '',
}

export const createProfileSlice: StateCreator<
  AppStore,
  [],
  [],
  ProfileSlice
> = (set, get) => ({
  form: emptyForm,
  saving: false,
  savedAt: null,
  hydrating: false,

  setField: (key, value) =>
    set((s) => ({
      profile: { ...s.profile, form: { ...s.profile.form, [key]: value } },
    })),

  applyForm: (form) => set((s) => ({ profile: { ...s.profile, form } })),

  hydrate: async () => {
    set((s) => ({ profile: { ...s.profile, hydrating: true } }))
    try {
      const item = await getPageForm(get().session.sessionId, 'profile')
      set((s) => ({ profile: { ...s.profile, form: item.form } }))
    } finally {
      set((s) => ({ profile: { ...s.profile, hydrating: false } }))
    }
  },

  persist: async () => {
    set((s) => ({ profile: { ...s.profile, saving: true } }))
    try {
      await putPageForm(get().session.sessionId, 'profile', get().profile.form)
      set((s) => ({
        profile: { ...s.profile, savedAt: new Date().toISOString() },
      }))
    } finally {
      set((s) => ({ profile: { ...s.profile, saving: false } }))
    }
  },

  reset: () =>
    set((s) => ({
      profile: {
        ...s.profile,
        form: emptyForm,
        saving: false,
        savedAt: null,
        hydrating: false,
      },
    })),
})
