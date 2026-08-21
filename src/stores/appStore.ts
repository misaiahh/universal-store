import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import createDeepMerge from '@fastify/deepmerge'
import { createProfileSlice, type ProfileSlice } from './slices/profile/slice'
import { createCompanySlice, type CompanySlice } from './slices/company/slice'
import { createBillingSlice, type BillingSlice } from './slices/billing/slice'
import {
  createPreferencesSlice,
  type PreferencesSlice,
} from './slices/preferences/slice'
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
//
// LIFECYCLE VERBS are uniform across page slices: `stage()` soft-writes into a
// page's working `form` and recomputes `dirty`; `persist()` commits that form to
// DynamoDB (the "hard" baseline). Because every slice lives on this one store,
// any page can drive ANOTHER page directly — no cross-slice API needed:
//   store.billing.stage('billingZip', zip)  // mark billing dirty from here...
//   store.billing.persist()                 // ...and optionally commit it too.
// Staging without persisting is intentional: it leaves the other page dirty so
// the user can navigate there and save it themselves.
export type AppStore = HydrationSlice & {
  session: SessionSlice
  profile: ProfileSlice
  company: CompanySlice
  billing: BillingSlice
  preferences: PreferencesSlice
}

// Deep merge for persist's rehydration. With NESTED slices, persist's default
// shallow merge would replace a whole slice object with the persisted one and
// drop that slice's functions (persist/stage/hydrate). deepMerge(current,
// persisted) overlays only the persisted DATA (each slice's flat form fields) on
// top of the freshly-created slices, keeping every action intact after a reload.
//
// ARRAYS are REPLACED, not concatenated (fastify's default). A persisted form
// array (e.g. profile.phones) is the authoritative soft value; concatenating it
// onto the initial form's array would duplicate/prepend items. Returning a clone
// of the source array makes rehydration overwrite with exactly what was saved.
const deepMerge = createDeepMerge({
  all: true,
  mergeArray:
    ({ clone }) =>
    (_target, source) =>
      clone(source),
})

// Persist only each slice's SOFT form fields (data) plus the session's
// `sessionId`. Each page slice owns its persisted shape via its own
// `partialize()`, which returns its flat soft fields as a whole-form object that
// deepMerge overlays back onto the slice root on rehydration. The HARD snapshot
// is deliberately NOT persisted (it's the last-known DynamoDB value, re-
// established on the next hydrate). Transient status (saving/savedAt/dirty) and
// all functions are omitted, so sessionStorage holds pure soft form values
// keyed by the persisted sessionId.
function partialize(state: AppStore) {
  return {
    session: { sessionId: state.session.sessionId },
    profile: state.profile.partialize(),
    company: state.company.partialize(),
    billing: state.billing.partialize(),
    preferences: state.preferences.partialize(),
  }
}

// After a refresh the SOFT fields are restored from sessionStorage but HARD is
// not persisted, so it would default to emptyForm and wrongly flag the page
// dirty. Mirror each restored soft form into hard (and clear dirty) so a
// reloaded tab starts clean — dirty only becomes meaningful again after the next
// hydrate or a fresh edit. Runs generically over every page.
function reconcileHardWithSoft(state: AppStore) {
  // A per-key call (rather than a generic loop) keeps each `apply` call
  // monomorphic so TypeScript can match each page's form type to its setter. Each
  // slice's partialize() returns its soft fields, which become the hard baseline,
  // leaving each page clean.
  state.profile.apply(state.profile.partialize())
  state.company.apply(state.company.partialize())
  state.billing.apply(state.billing.partialize())
  state.preferences.apply(state.preferences.partialize())
}

// persist -> sessionStorage. Every page's form values survive a tab refresh;
// the deep merge restores them onto live slices without losing actions. The
// immer MIDDLEWARE wraps the store creator so every slice's `set` receives a
// mutable draft of the whole store — actions mutate the draft directly instead
// of spreading. persist/partialize/merge still see plain state, since immer only
// changes how `set` applies updates.
export const useAppStore = create<AppStore>()(
  persist(
    immer((...a) => ({
      ...createHydrationSlice(...a),
      ...createSessionSlice(...a),
      profile: createProfileSlice(...a),
      company: createCompanySlice(...a),
      billing: createBillingSlice(...a),
      preferences: createPreferencesSlice(...a),
    })),
    {
      name: 'universal-store',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize,
      merge: (persisted, current) =>
        deepMerge(current, persisted as Partial<AppStore>) as AppStore,
      // After rehydration completes: (1) ensure a sessionId exists — covers the
      // first ever load AND recovery after a developer manually clears the
      // sessionStorage key (no sessionId in the rehydrated state → mint one; if
      // one WAS restored this is a no-op and soft data stays intact); (2)
      // reconcile hard with the restored soft form so a reloaded tab starts
      // clean (dirty=false) until the next hydrate.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.session.ensureSession()
        reconcileHardWithSoft(state)
      },
    },
  ),
)

// sessionStorage is synchronous, so persist rehydrates during create() above and
// onRehydrateStorage has already run. This extra call is a belt-and-braces guard
// for the case where there was NO persisted state at all (onRehydrateStorage's
// state arg can be undefined): it mints the very first sessionId.
useAppStore.getState().session.ensureSession()
