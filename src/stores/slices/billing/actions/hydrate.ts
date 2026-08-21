import { getPageForm } from '../../../../api/dynamoClient'
import type { BillingSet, BillingGet } from './types'

// Refetch JUST this page from DynamoDB (keyed by the current session.sessionId).
// The fetched value becomes both soft and hard, so the page lands clean.
export function createHydrate(
  set: BillingSet,
  get: BillingGet,
): () => Promise<void> {
  return async () => {
    set((s) => {
      s.billing.hydrating = true
    })
    try {
      const item = await getPageForm(get().session.sessionId, 'billing')
      set((s) => {
        s.billing.cardName = item.form.cardName
        s.billing.cardNumber = item.form.cardNumber
        s.billing.billingZip = item.form.billingZip
        s.billing.hard = item.form
        s.billing.dirty = false
      })
    } finally {
      set((s) => {
        s.billing.hydrating = false
      })
    }
  }
}
