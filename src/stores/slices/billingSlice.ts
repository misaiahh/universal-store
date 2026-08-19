import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { BillingForm } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'

// Billing page slice — NESTED under the `billing` key. Form values, a field
// setter, load/save status, and the DynamoDB actions: `applyForm` (set from an
// already-fetched item), `hydrate()` (refetch just this page), `persist()`
// (hard-save just this page), and `reset()` (wipe this page's soft data on a
// session change). Keyed by the current session.sessionId.
export interface BillingSlice {
  form: BillingForm
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  setField: <K extends keyof BillingForm>(key: K, value: BillingForm[K]) => void
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
  [],
  [],
  BillingSlice
> = (set, get) => ({
  form: emptyForm,
  saving: false,
  savedAt: null,
  hydrating: false,

  setField: (key, value) =>
    set((s) => ({
      billing: { ...s.billing, form: { ...s.billing.form, [key]: value } },
    })),

  applyForm: (form) => set((s) => ({ billing: { ...s.billing, form } })),

  hydrate: async () => {
    set((s) => ({ billing: { ...s.billing, hydrating: true } }))
    try {
      const item = await getPageForm(get().session.sessionId, 'billing')
      set((s) => ({ billing: { ...s.billing, form: item.form } }))
    } finally {
      set((s) => ({ billing: { ...s.billing, hydrating: false } }))
    }
  },

  persist: async () => {
    set((s) => ({ billing: { ...s.billing, saving: true } }))
    try {
      await putPageForm(get().session.sessionId, 'billing', get().billing.form)
      set((s) => ({
        billing: { ...s.billing, savedAt: new Date().toISOString() },
      }))
    } finally {
      set((s) => ({ billing: { ...s.billing, saving: false } }))
    }
  },

  reset: () =>
    set((s) => ({
      billing: {
        ...s.billing,
        form: emptyForm,
        saving: false,
        savedAt: null,
        hydrating: false,
      },
    })),
})
