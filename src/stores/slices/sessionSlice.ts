import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import { PAGE_KEYS } from '../pages'

// Session slice — NESTED under the `session` key. Owns the `sessionId` that is
// the DynamoDB PARTITION KEY for every page read/write. The sessionId lives in
// the persisted store (sessionStorage), so it survives a tab refresh alongside
// the forms.
//
// Because every page's "soft" (sessionStorage) data belongs to exactly one
// sessionId, any time the sessionId CHANGES or is DELETED, that soft data is no
// longer valid and must be wiped. This slice centralises that lifecycle:
//   - ensureSession(): generate an id if none exists (first load, or recovery
//     after a developer manually clears sessionStorage).
//   - setSessionId(id): switch to a new id; wipe soft data if it actually
//     changed.
//   - resetSession(): generate a fresh id and wipe soft data (the "New session"
//     button).
// The wipe is generic: it iterates PAGE_KEYS and calls each page slice's
// reset(), so adding a page needs no change here.
export interface SessionSlice {
  sessionId: string
  ensureSession: () => void
  setSessionId: (id: string) => void
  resetSession: () => void
  wipeSoftData: () => void
}

function newSessionId(): string {
  return crypto.randomUUID()
}

export const createSessionSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  { session: SessionSlice }
> = (set, get) => ({
  session: {
    sessionId: '',

    // Reset every page's form back to its empty defaults. This is the "soft
    // wipe": it clears the in-memory forms, and because persist mirrors the
    // store into sessionStorage, the persisted form data is overwritten too.
    wipeSoftData: () => {
      for (const key of PAGE_KEYS) {
        get()[key].reset()
      }
    },

    // Ensure a sessionId exists. Called on load: if the persisted state had no
    // sessionId (fresh app, or the developer manually deleted the storage key)
    // we mint one. No wipe here — an absent id means there is nothing stale to
    // clear, and forms are already empty in that case.
    ensureSession: () => {
      if (!get().session.sessionId) {
        set((s) => {
          s.session.sessionId = newSessionId()
        })
      }
    },

    // Switch to an explicit sessionId. If it differs from the current one, the
    // existing soft data belongs to the OLD session and is wiped first.
    setSessionId: (id) => {
      if (id === get().session.sessionId) return
      get().session.wipeSoftData()
      set((s) => {
        s.session.sessionId = id
      })
    },

    // Start a brand-new session: mint a fresh id and wipe all soft data.
    resetSession: () => {
      get().session.wipeSoftData()
      set((s) => {
        s.session.sessionId = newSessionId()
      })
    },
  },
})
