import type { PreferencesForm } from '../types'
import type { PreferencesSet } from './types'

// Loaded from DynamoDB: this value IS the hard baseline, so soft = hard and the
// page is clean. Used by the top-level bulk hydrate (hydrationSlice) and by
// reconcileHardWithSoft on rehydration.
export function createApply(
  set: PreferencesSet,
): (form: PreferencesForm) => void {
  return (form) =>
    set((s) => {
      s.preferences.theme = form.theme
      s.preferences.newsletter = form.newsletter
      s.preferences.language = form.language
      s.preferences.hard = form
      s.preferences.dirty = false
    })
}
