import { emptyForm } from '../constants'
import type { PreferencesSet } from './types'

// Wipe soft + hard back to defaults and clear all status. Called when the
// session changes so a new session never sees the previous one's data.
export function createReset(set: PreferencesSet): () => void {
  return () =>
    set((s) => {
      s.preferences.theme = emptyForm.theme
      s.preferences.newsletter = emptyForm.newsletter
      s.preferences.language = emptyForm.language
      s.preferences.hard = emptyForm
      s.preferences.dirty = false
      s.preferences.saving = false
      s.preferences.savedAt = null
      s.preferences.hydrating = false
    })
}
