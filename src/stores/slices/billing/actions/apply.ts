import type { BillingForm } from '../types'
import type { BillingSet } from './types'

// Loaded from DynamoDB: this value IS the hard baseline, so soft = hard and the
// page is clean. Used by the top-level bulk hydrate (hydrationSlice) and by
// reconcileHardWithSoft on rehydration.
export function createApply(set: BillingSet): (form: BillingForm) => void {
  return (form) =>
    set((s) => {
      s.billing.cardName = form.cardName
      s.billing.cardNumber = form.cardNumber
      s.billing.billingZip = form.billingZip
      s.billing.hard = form
      s.billing.dirty = false
    })
}
