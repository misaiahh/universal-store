import { emptyForm } from '../constants'
import type { BillingSet } from './types'

// Wipe soft + hard back to defaults and clear all status. Called when the
// session changes so a new session never sees the previous one's data.
export function createReset(set: BillingSet): () => void {
  return () =>
    set((s) => {
      s.billing.cardName = emptyForm.cardName
      s.billing.cardNumber = emptyForm.cardNumber
      s.billing.billingZip = emptyForm.billingZip
      s.billing.hard = emptyForm
      s.billing.dirty = false
      s.billing.saving = false
      s.billing.savedAt = null
      s.billing.hydrating = false
    })
}
