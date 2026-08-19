import { gql } from '@apollo/client'
import type { PageKey, PageFormData } from '../stores/pages'
import { apolloClient } from './apolloClient'

// DynamoDB-shaped data access, now backed by Apollo Client. Each function runs a
// real GraphQL query/mutation against the in-process executable schema
// (api/schema.ts) via SchemaLink — the single-table model (pk = sessionId, sk =
// PageKey, `form` = that page's values) is unchanged, so nothing downstream
// (hydration slice / page slices) changes. Swapping SchemaLink for an HttpLink
// to a real GraphQL server is the only change needed to go live.

// One row in the table. `sk` is the page key; `form` is that page's typed values.
export interface PageItem<K extends PageKey = PageKey> {
  pk: string // e.g. "USER#<sessionId>"
  sk: K // the page key / sort key
  form: PageFormData[K]
  updatedAt: string
}

// Union of every concrete item type — what a query returns as a heterogeneous
// list, one per sort key.
export type AnyPageItem = { [K in PageKey]: PageItem<K> }[PageKey]

const PAGES_BY_SESSION = gql`
  query PagesBySession($sessionId: String!) {
    pagesBySession(sessionId: $sessionId) {
      pk
      sk
      form
      updatedAt
    }
  }
`

const PAGE_FORM = gql`
  query PageForm($sessionId: String!, $pageKey: String!) {
    pageForm(sessionId: $sessionId, pageKey: $pageKey) {
      pk
      sk
      form
      updatedAt
    }
  }
`

const PUT_PAGE_FORM = gql`
  mutation PutPageForm($sessionId: String!, $pageKey: String!, $form: JSON!) {
    putPageForm(sessionId: $sessionId, pageKey: $pageKey, form: $form) {
      pk
      sk
      form
      updatedAt
    }
  }
`

// Query(pk = sessionId): one item per page (sort key), like a single-partition
// query. Uses no-cache so a refetch always reflects the latest server state.
export async function queryPagesByUser(
  sessionId: string,
): Promise<AnyPageItem[]> {
  const { data } = await apolloClient.query<{
    pagesBySession: AnyPageItem[]
  }>({
    query: PAGES_BY_SESSION,
    variables: { sessionId },
    fetchPolicy: 'no-cache',
    errorPolicy: 'none',
  })
  if (!data) throw new Error('pagesBySession returned no data')
  return data.pagesBySession
}

// GetItem(pk = sessionId, sk = pageKey): refetch JUST one page's form — the read
// behind a per-page hydrate().
export async function getPageForm<K extends PageKey>(
  sessionId: string,
  pageKey: K,
): Promise<PageItem<K>> {
  const { data } = await apolloClient.query<{ pageForm: PageItem<K> }>({
    query: PAGE_FORM,
    variables: { sessionId, pageKey },
    fetchPolicy: 'no-cache',
    errorPolicy: 'none',
  })
  if (!data) throw new Error(`pageForm returned no data for ${pageKey}`)
  return data.pageForm
}

// PutItem(pk = sessionId, sk = pageKey): the "hard save" — overwrites that one
// page's item with the current form.
export async function putPageForm<K extends PageKey>(
  sessionId: string,
  pageKey: K,
  form: PageFormData[K],
): Promise<PageItem<K>> {
  const { data } = await apolloClient.mutate<{ putPageForm: PageItem<K> }>({
    mutation: PUT_PAGE_FORM,
    variables: { sessionId, pageKey, form },
    errorPolicy: 'none',
  })
  if (!data) throw new Error(`putPageForm returned no data for ${pageKey}`)
  return data.putPageForm
}
