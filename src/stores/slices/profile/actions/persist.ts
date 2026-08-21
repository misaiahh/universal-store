import type { ProfileForm } from '../types'
import { putPageForm } from '../../../../api/dynamoClient'
import { deepEqual } from '../../../deepEqual'
import type { ProfileSet, ProfileGet } from './types'

// Hard-save JUST this page to DynamoDB. Gathers the current soft fields, writes
// them, then promotes that value to the hard baseline so dirty clears.
export function createPersist(
  set: ProfileSet,
  get: ProfileGet,
): () => Promise<void> {
  return async () => {
    set((s) => {
      s.profile.saving = true
    })
    try {
      const p = get().profile
      const saved: ProfileForm = {
        fullName: p.fullName,
        email: p.email,
        address: p.address,
        phones: p.phones,
      }
      await putPageForm(get().session.sessionId, 'profile', saved)
      // Hard-saved: the soft copy is now the hard baseline, so dirty clears.
      set((s) => {
        s.profile.hard = saved
        const soft: ProfileForm = {
          fullName: s.profile.fullName,
          email: s.profile.email,
          address: s.profile.address,
          phones: s.profile.phones,
        }
        s.profile.dirty = !deepEqual(soft, saved)
        s.profile.savedAt = new Date().toISOString()
      })
    } finally {
      set((s) => {
        s.profile.saving = false
      })
    }
  }
}
