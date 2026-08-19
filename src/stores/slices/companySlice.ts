import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { CompanyForm } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'

// Company page slice — NESTED under the `company` key. Form values, a field
// setter, load/save status, and the DynamoDB actions: `applyForm` (set from an
// already-fetched item), `hydrate()` (refetch just this page), `persist()`
// (hard-save just this page), and `reset()` (wipe this page's soft data on a
// session change). Keyed by the current session.sessionId.
export interface CompanySlice {
  form: CompanyForm
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  setField: <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => void
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
  [],
  [],
  CompanySlice
> = (set, get) => ({
  form: emptyForm,
  saving: false,
  savedAt: null,
  hydrating: false,

  setField: (key, value) =>
    set((s) => ({
      company: { ...s.company, form: { ...s.company.form, [key]: value } },
    })),

  applyForm: (form) => set((s) => ({ company: { ...s.company, form } })),

  hydrate: async () => {
    set((s) => ({ company: { ...s.company, hydrating: true } }))
    try {
      const item = await getPageForm(get().session.sessionId, 'company')
      set((s) => ({ company: { ...s.company, form: item.form } }))
    } finally {
      set((s) => ({ company: { ...s.company, hydrating: false } }))
    }
  },

  persist: async () => {
    set((s) => ({ company: { ...s.company, saving: true } }))
    try {
      await putPageForm(get().session.sessionId, 'company', get().company.form)
      set((s) => ({
        company: { ...s.company, savedAt: new Date().toISOString() },
      }))
    } finally {
      set((s) => ({ company: { ...s.company, saving: false } }))
    }
  },

  reset: () =>
    set((s) => ({
      company: {
        ...s.company,
        form: emptyForm,
        saving: false,
        savedAt: null,
        hydrating: false,
      },
    })),
})
