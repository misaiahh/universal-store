import type { ProfileActivity } from '../types'
import { queryProfileActivity } from '../../../../api/profileActivity'
import type { ProfileGet } from './types'

// Type 2 — pure query that returns its result. No `set`, no loading/error
// tracking, nothing stored: the frozen Apollo tree is handed straight back for
// the caller to consume. Because it never enters an immer draft, there is no
// clone and no freezing conflict — the store is entirely uninvolved.
export function createFetchActivity(
  get: ProfileGet,
): () => Promise<ProfileActivity> {
  return async () => {
    return await queryProfileActivity(get().session.sessionId)
  }
}
