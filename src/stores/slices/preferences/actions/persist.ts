import type { PreferencesForm } from '../types'
import { putPageForm } from '../../../../api/dynamoClient'
import { deepEqual } from '../../../deepEqual'
import type { PreferencesSet, PreferencesGet } from './types'

// Hard-save JUST this page to DynamoDB. Gathers the current soft fields, writes
// them, then promotes that value to the hard baseline so dirty clears.
export function createPersist(
  set: PreferencesSet,
  get: PreferencesGet,
): () => Promise<void> {
  return async () => {
    set((s) => {
      s.preferences.saving = true
    })
    try {
      const p = get().preferences
      const saved: PreferencesForm = {
        theme: p.theme,
        newsletter: p.newsletter,
        language: p.language,
      }
      await putPageForm(get().session.sessionId, 'preferences', saved)
      // Hard-saved: the soft copy is now the hard baseline, so dirty clears.
      set((s) => {
        s.preferences.hard = saved
        const soft: PreferencesForm = {
          theme: s.preferences.theme,
          newsletter: s.preferences.newsletter,
          language: s.preferences.language,
        }
        s.preferences.dirty = !deepEqual(soft, saved)
        s.preferences.savedAt = new Date().toISOString()
      })
    } finally {
      set((s) => {
        s.preferences.saving = false
      })
    }
  }
}
