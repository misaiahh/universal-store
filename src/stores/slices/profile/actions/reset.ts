import { emptyForm } from '../constants'
import type { ProfileSet } from './types'

// Wipe soft + hard back to defaults and clear all status/activity. Called when
// the session changes so a new session never sees the previous one's data.
export function createReset(set: ProfileSet): () => void {
  return () =>
    set((s) => {
      s.profile.fullName = emptyForm.fullName
      s.profile.email = emptyForm.email
      s.profile.address = emptyForm.address
      s.profile.phones = emptyForm.phones
      s.profile.hard = emptyForm
      s.profile.dirty = false
      s.profile.saving = false
      s.profile.savedAt = null
      s.profile.hydrating = false
      s.profile.activity = null
      s.profile.activityLoading = false
      s.profile.activityError = null
    })
}
