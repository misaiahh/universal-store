import { queryProfileActivity } from '../../../../api/profileActivity'
import type { ProfileSet, ProfileGet } from './types'

// Type 1 — lazy query that writes into the store. Loading/error live in the
// slice, and the result is stored for any component reading `profile.activity`.
// The critical line is the structuredClone: `data` is Apollo-frozen, and
// assigning it straight into the immer draft would leave a frozen subtree that
// any later mutating recipe could not touch. Cloning hands immer a plain,
// mutable copy it fully owns.
export function createLoadActivity(
  set: ProfileSet,
  get: ProfileGet,
): () => Promise<void> {
  return async () => {
    if (get().profile.activityLoading) return
    set((s) => {
      s.profile.activityLoading = true
      s.profile.activityError = null
    })
    try {
      const data = await queryProfileActivity(get().session.sessionId)
      set((s) => {
        s.profile.activity = structuredClone(data)
      })
    } catch (err) {
      set((s) => {
        s.profile.activityError =
          err instanceof Error ? err.message : String(err)
      })
    } finally {
      set((s) => {
        s.profile.activityLoading = false
      })
    }
  }
}
