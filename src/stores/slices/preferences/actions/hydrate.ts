import { getPageForm } from '../../../../api/dynamoClient'
import type { PreferencesSet, PreferencesGet } from './types'

// Refetch JUST this page from DynamoDB (keyed by the current session.sessionId).
// The fetched value becomes both soft and hard, so the page lands clean.
export function createHydrate(
  set: PreferencesSet,
  get: PreferencesGet,
): () => Promise<void> {
  return async () => {
    set((s) => {
      s.preferences.hydrating = true
    })
    try {
      const item = await getPageForm(get().session.sessionId, 'preferences')
      set((s) => {
        s.preferences.theme = item.form.theme
        s.preferences.newsletter = item.form.newsletter
        s.preferences.language = item.form.language
        s.preferences.hard = item.form
        s.preferences.dirty = false
      })
    } finally {
      set((s) => {
        s.preferences.hydrating = false
      })
    }
  }
}
