import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import createDeepMerge from '@fastify/deepmerge'
import { createSelectors } from './createSelectors'
import { createProfileSlice, type ProfileSlice } from './slices/profileSlice'
import { createCompanySlice, type CompanySlice } from './slices/companySlice'
import { createBillingSlice, type BillingSlice } from './slices/billingSlice'
import {
  createPreferencesSlice,
  type PreferencesSlice,
} from './slices/preferencesSlice'
import {
  createHydrationSlice,
  type HydrationSlice,
} from './slices/hydrationSlice'
import { createSessionSlice, type SessionSlice } from './slices/sessionSlice'

// The single UNIVERSAL store. Each PAGE is NESTED under its own key, so every
// page slice can expose an identically named `persist()` action with no
// collision (e.g. store.profile.persist(), store.billing.persist()). The
// hydration slice stays at the top level and provides one `hydrate()` that loads
// every page at once. The `session` slice owns the sessionId that keys every
// DynamoDB read/write.
export type AppStore = HydrationSlice & {
  session: SessionSlice
  profile: ProfileSlice
  company: CompanySlice
  billing: BillingSlice
  preferences: PreferencesSlice
}

// Deep merge for persist's rehydration. With NESTED slices, persist's default
// shallow merge would replace a whole slice object with the persisted one and
// drop that slice's functions (persist/setField/hydrate). deepMerge(current,
// persisted) overlays only the persisted DATA (each slice's `form`) on top of
// the freshly-created slices, keeping every action intact after a reload.
const deepMerge = createDeepMerge({ all: true })

// Persist only each slice's `form` (data) plus the session's `sessionId`.
// Transient status (saving/savedAt) and all functions are omitted, so
// sessionStorage holds pure form values keyed by the persisted sessionId.
function partialize(state: AppStore) {
  return {
    session: { sessionId: state.session.sessionId },
    profile: { form: state.profile.form },
    company: { form: state.company.form },
    billing: { form: state.billing.form },
    preferences: { form: state.preferences.form },
  }
}

// persist -> sessionStorage. Every page's form values survive a tab refresh;
// the deep merge restores them onto live slices without losing actions.
export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createHydrationSlice(...a),
      ...createSessionSlice(...a),
      profile: createProfileSlice(...a),
      company: createCompanySlice(...a),
      billing: createBillingSlice(...a),
      preferences: createPreferencesSlice(...a),
    }),
    {
      name: 'universal-store',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize,
      merge: (persisted, current) =>
        deepMerge(current, persisted as Partial<AppStore>) as AppStore,
      // After rehydration completes, ensure a sessionId exists. This covers the
      // first ever load AND recovery after a developer manually clears the
      // sessionStorage key: in both cases the rehydrated state carries no
      // sessionId, so we mint one. When a sessionId WAS restored from storage
      // this is a no-op and the existing soft data stays intact.
      onRehydrateStorage: () => (state) => {
        state?.session.ensureSession()
      },
    },
  ),
)

// sessionStorage is synchronous, so persist rehydrates during create() above and
// onRehydrateStorage has already run. This extra call is a belt-and-braces guard
// for the case where there was NO persisted state at all (onRehydrateStorage's
// state arg can be undefined): it mints the very first sessionId.
useAppStore.getState().session.ensureSession()

// Auto-generated per-key selectors: appStore.use.profile(), etc.
export const appStore = createSelectors(useAppStore)
