import { gql } from '@apollo/client'
import type { ProfileActivity } from '../stores/pages'
import { apolloClient } from './apolloClient'

// Direct @apollo/client read of the profile activity feed. This is deliberately
// SEPARATE from dynamoClient.ts: it is read-only enrichment (not part of the
// DynamoDB single-table form model) and its result is a deeply nested, Apollo-
// FROZEN tree. The two profileSlice actions that consume it demonstrate the two
// ways a component-facing query is wired into (or around) an immer store.
const PROFILE_ACTIVITY = gql`
  query ProfileActivity($sessionId: String!) {
    profileActivity(sessionId: $sessionId) {
      summary {
        totalEvents
        lastSeen
        topKind
      }
      events {
        id
        kind
        at
        metadata {
          ip
          device
          location
        }
      }
    }
  }
`

// Run the query and return Apollo's data. The returned object is deep-frozen by
// InMemoryCache, so callers that intend to hand it to an immer `set` must clone
// it first (see profileSlice.loadActivity); callers that only read it (or return
// it to a component) can use it as-is (see profileSlice.fetchActivity).
export async function queryProfileActivity(
  sessionId: string,
): Promise<ProfileActivity> {
  const { data } = await apolloClient.query<{
    profileActivity: ProfileActivity
  }>({
    query: PROFILE_ACTIVITY,
    variables: { sessionId },
    fetchPolicy: 'no-cache',
    errorPolicy: 'none',
  })
  if (!data) throw new Error('profileActivity returned no data')
  return data.profileActivity
}
