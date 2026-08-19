import { ApolloClient, InMemoryCache } from '@apollo/client'
import { SchemaLink } from '@apollo/client/link/schema'
import { schema } from './schema'

// The single ApolloClient for the app. A SchemaLink executes operations directly
// against the in-process executable schema (see schema.ts), so real GraphQL
// queries/mutations run with no external server. Swapping this for a real
// backend is just replacing SchemaLink with an HttpLink to a GraphQL endpoint —
// every operation document and the calling code stay the same.
export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: new SchemaLink({ schema }),
})
