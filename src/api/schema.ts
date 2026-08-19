import { makeExecutableSchema } from '@graphql-tools/schema'
import { GraphQLScalarType, Kind, type ValueNode } from 'graphql'
import { PAGE_KEYS, type PageKey, type PageFormData } from '../stores/pages'

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

  type Query {
    # Query(pk = sessionId): every page item for a session, one per sort key.
    pagesBySession(sessionId: String!): [PageItem!]!
    # GetItem(pk = sessionId, sk = pageKey): a single page's item.
    pageForm(sessionId: String!, pageKey: String!): PageItem!
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
