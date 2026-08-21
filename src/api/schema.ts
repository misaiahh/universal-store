import { makeExecutableSchema } from '@graphql-tools/schema'
import { GraphQLScalarType, Kind, type ValueNode } from 'graphql'
import { PAGE_KEYS, type PageKey, type PageFormData } from '../stores/pages'
import type { ProfileActivity } from '../stores/slices/profile/types'

// Executable GraphQL schema standing in for the DynamoDB backend. Apollo Client
// runs real queries/mutations against this via SchemaLink — no network server.
// The single-table model is preserved: every page item is keyed by (pk, sk)
// where pk is the sessionId and sk is the PageKey; `form` carries that page's
// typed values. Because each page's form has a different shape, `form` is a JSON
// scalar so the exact PageFormData[K] shape passes through untouched.
//
// SEED is the in-memory table: one row per page. Mutations mutate it so a later
// query reflects the write, exactly like the previous mock.
const SEED: { [K in PageKey]: PageFormData[K] } = {
  profile: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    address: { street: '12 Analytical Way', city: 'London', zip: 'EC1A' },
    phones: [
      { label: 'mobile', number: '555-0100' },
      { label: 'work', number: '555-0199' },
    ],
  },
  company: {
    companyName: 'Analytical Engines Ltd',
    industry: 'Computing',
    employees: 42,
  },
  billing: {
    cardName: 'Ada Lovelace',
    cardNumber: '4242 4242 4242 4242',
    billingZip: '90210',
  },
  preferences: {
    theme: 'dark',
    newsletter: true,
    language: 'en',
  },
}

// Seed for the profile activity feed. Deeply nested on purpose (summary object +
// events array, each event with its own metadata object) so the direct-query
// examples in profileSlice have a realistic frozen tree to clone or return.
const ACTIVITY_SEED: ProfileActivity = {
  summary: {
    totalEvents: 3,
    lastSeen: '2025-11-02T09:15:00.000Z',
    topKind: 'login',
  },
  events: [
    {
      id: 'evt-1',
      kind: 'login',
      at: '2025-11-02T09:15:00.000Z',
      metadata: { ip: '10.0.0.1', device: 'MacBook Pro', location: 'London' },
    },
    {
      id: 'evt-2',
      kind: 'profile_update',
      at: '2025-10-30T14:02:00.000Z',
      metadata: { ip: '10.0.0.2', device: 'iPhone', location: 'London' },
    },
    {
      id: 'evt-3',
      kind: 'login',
      at: '2025-10-28T08:41:00.000Z',
      metadata: { ip: '10.0.0.1', device: 'MacBook Pro', location: 'Cambridge' },
    },
  ],
}

// Parse a GraphQL AST literal (used when `form` is inlined in a query document)
// into a plain JS value. Runtime values arriving via `variables` skip this.
function parseLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value
    case Kind.INT:
      return parseInt(ast.value, 10)
    case Kind.FLOAT:
      return parseFloat(ast.value)
    case Kind.NULL:
      return null
    case Kind.LIST:
      return ast.values.map(parseLiteral)
    case Kind.OBJECT: {
      const obj: Record<string, unknown> = {}
      for (const field of ast.fields) {
        obj[field.name.value] = parseLiteral(field.value)
      }
      return obj
    }
    default:
      return null
  }
}

// A permissive JSON scalar so each page's differently-shaped form round-trips
// with no per-field GraphQL typing.
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value (a page form payload).',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral,
})

const typeDefs = /* GraphQL */ `
  scalar JSON

  # One row of the single-table design.
  type PageItem {
    pk: String!
    sk: String!
    form: JSON!
    updatedAt: String!
  }

  # Deeply nested read-only enrichment for the profile page. Modelled with real
  # GraphQL types (not the JSON scalar) so the query result is a genuine nested
  # tree — the shape the direct-query slice actions must clone before immer can
  # own it.
  type ActivityMetadata {
    ip: String!
    device: String!
    location: String!
  }

  type ActivityEvent {
    id: String!
    kind: String!
    at: String!
    metadata: ActivityMetadata!
  }

  type ActivitySummary {
    totalEvents: Int!
    lastSeen: String!
    topKind: String!
  }

  type ProfileActivity {
    summary: ActivitySummary!
    events: [ActivityEvent!]!
  }

  type Query {
    # Query(pk = sessionId): every page item for a session, one per sort key.
    pagesBySession(sessionId: String!): [PageItem!]!
    # GetItem(pk = sessionId, sk = pageKey): a single page's item.
    pageForm(sessionId: String!, pageKey: String!): PageItem!
    # Direct enrichment read for the profile page: a nested activity feed.
    profileActivity(sessionId: String!): ProfileActivity!
  }

  type Mutation {
    # PutItem: hard-save one page's form; overwrites that row.
    putPageForm(sessionId: String!, pageKey: String!, form: JSON!): PageItem!
  }
`

function item(sessionId: string, pageKey: PageKey) {
  return {
    pk: `USER#${sessionId}`,
    sk: pageKey,
    form: SEED[pageKey],
    updatedAt: new Date().toISOString(),
  }
}

const resolvers = {
  JSON: JSONScalar,
  Query: {
    pagesBySession: (_: unknown, args: { sessionId: string }) =>
      PAGE_KEYS.map((sk) => item(args.sessionId, sk)),
    pageForm: (
      _: unknown,
      args: { sessionId: string; pageKey: PageKey },
    ) => item(args.sessionId, args.pageKey),
    // Returns the seeded activity tree. SchemaLink hands this to Apollo, whose
    // InMemoryCache deep-freezes it before the store ever sees it.
    profileActivity: (): ProfileActivity => ACTIVITY_SEED,
  },
  Mutation: {
    putPageForm: (
      _: unknown,
      args: { sessionId: string; pageKey: PageKey; form: PageFormData[PageKey] },
    ) => {
      SEED[args.pageKey] = args.form as never
      return item(args.sessionId, args.pageKey)
    },
  },
}

export const schema = makeExecutableSchema({ typeDefs, resolvers })
