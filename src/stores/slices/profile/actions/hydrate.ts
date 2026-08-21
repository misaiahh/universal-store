import { getPageForm } from '../../../../api/dynamoClient'
import type { ProfileSet, ProfileGet } from './types'

// Refetch JUST this page from DynamoDB (keyed by the current session.sessionId).
// The fetched value becomes both soft and hard, so the page lands clean.
export function createHydrate(
  set: ProfileSet,
  get: ProfileGet,
): () => Promise<void> {
  return async () => {
    set((s) => {
      s.profile.hydrating = true
    })
    try {
      const item = await getPageForm(get().session.sessionId, 'profile')
      set((s) => {
        s.profile.fullName = item.form.fullName
        s.profile.email = item.form.email
        s.profile.address = item.form.address
        s.profile.phones = item.form.phones
        s.profile.hard = item.form
        s.profile.dirty = false
      })
    } finally {
      set((s) => {
        s.profile.hydrating = false
      })
    }
  }
}
