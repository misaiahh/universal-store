// Central registry of every page in the app. Each PageKey doubles as the
// DynamoDB SORT KEY for that page's item (see api/dynamoClient.ts) and as the
// identifier used to route hydration into the correct slice.
//
// This file is a THIN registry: it enumerates the pages and composes the
// PageKey → Form map, but the form shapes themselves are OWNED by each slice
// (imported below). Adding a page is a multi-step change (see
// docs/ADD_A_PAGE.md): add the key here, define its form type in the slice's
// types.ts, add it to PageFormData below, add its slice, and wire it into
// appStore.ts + hydrationSlice.ts.
import type { ProfileForm } from './slices/profile/types'
import type { CompanyForm } from './slices/company/types'
import type { BillingForm } from './slices/billing/types'
import type { PreferencesForm } from './slices/preferences/types'

export const PAGE_KEYS = ['profile', 'company', 'billing', 'preferences'] as const

export type PageKey = (typeof PAGE_KEYS)[number]

// Maps each page key to its form data type. Used to type the DynamoDB items and
// the hydration payload so a page's data can never be routed to the wrong slice.
// Each form type is owned by its slice; this map is the only place they are
// composed into an all-pages registry.
export interface PageFormData {
  profile: ProfileForm
  company: CompanyForm
  billing: BillingForm
  preferences: PreferencesForm
}
