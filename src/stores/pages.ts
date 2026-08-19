// Central registry of every page in the app. Each PageKey doubles as the
// DynamoDB SORT KEY for that page's item (see api/dynamoClient.ts) and as the
// identifier used to route hydration into the correct slice.
//
// Adding a page is a 3-step change: add the key here, add its slice, and add its
// form data type to PageFormData below.
export const PAGE_KEYS = ['profile', 'company', 'billing', 'preferences'] as const

export type PageKey = (typeof PAGE_KEYS)[number]

// Form value shape for each page. These are the ONLY fields that get persisted
// and the fields that DynamoDB items must carry under their `form` attribute.
//
// Profile intentionally models the two non-flat shapes a form can grow into: a
// nested OBJECT (`address`) and an ARRAY of objects (`phones`). deepEqual already
// recurses into both, so `dirty` is correct; the slice's immer-based setters are
// what make editing them ergonomic.
export interface Address {
  street: string
  city: string
  zip: string
}

export interface Phone {
  label: string
  number: string
}

export interface ProfileForm {
  fullName: string
  email: string
  address: Address
  phones: Phone[]
}

export interface CompanyForm {
  companyName: string
  industry: string
  employees: number
}

export interface BillingForm {
  cardName: string
  cardNumber: string
  billingZip: string
}

export interface PreferencesForm {
  theme: 'light' | 'dark'
  newsletter: boolean
  language: string
}

// Maps each page key to its form data type. Used to type the DynamoDB items and
// the hydration payload so a page's data can never be routed to the wrong slice.
export interface PageFormData {
  profile: ProfileForm
  company: CompanyForm
  billing: BillingForm
  preferences: PreferencesForm
}

// Read-only enrichment for the profile page, fetched via a direct @apollo/client
// query (NOT part of the DynamoDB single-table form model). It is intentionally
// DEEPLY NESTED — a summary object plus an array of events each carrying its own
// metadata object — so it exercises the immer-vs-frozen-Apollo-result issue: the
// query result is a frozen, deeply nested tree, and immer can only take
// ownership of a structuredClone of it.
export interface ActivityMetadata {
  ip: string
  device: string
  location: string
}

export interface ActivityEvent {
  id: string
  kind: string
  at: string
  metadata: ActivityMetadata
}

export interface ActivitySummary {
  totalEvents: number
  lastSeen: string
  topKind: string
}

export interface ProfileActivity {
  summary: ActivitySummary
  events: ActivityEvent[]
}


