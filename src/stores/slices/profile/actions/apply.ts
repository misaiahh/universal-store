import type { ProfileForm } from '../types'
import type { ProfileSet } from './types'

// Loaded from DynamoDB: this value IS the hard baseline, so soft = hard and the
// page is clean. Used by the top-level bulk hydrate (hydrationSlice) and by
// reconcileHardWithSoft on rehydration.
export function createApply(set: ProfileSet): (form: ProfileForm) => void {
  return (form) =>
    set((s) => {
      s.profile.fullName = form.fullName
      s.profile.email = form.email
      s.profile.address = form.address
      s.profile.phones = form.phones
      s.profile.hard = form
      s.profile.dirty = false
    })
}
