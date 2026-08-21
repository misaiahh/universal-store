import type { BillingForm } from '../types'
import { putPageForm } from '../../../../api/dynamoClient'
import { deepEqual } from '../../../deepEqual'
import type { BillingSet, BillingGet } from './types'

// Hard-save JUST this page to DynamoDB. Gathers the current soft fields, writes
// them, then promotes that value to the hard baseline so dirty clears.
export function createPersist(
  set: BillingSet,
  get: BillingGet,
): () => Promise<void> {
  return async () => {
    set((s) => {
      s.billing.saving = true
    })
    try {
      const b = get().billing
      const saved: BillingForm = {
        cardName: b.cardName,
        cardNumber: b.cardNumber,
        billingZip: b.billingZip,
      }
      await putPageForm(get().session.sessionId, 'billing', saved)
      // Hard-saved: the soft copy is now the hard baseline, so dirty clears.
      set((s) => {
        s.billing.hard = saved
        const soft: BillingForm = {
          cardName: s.billing.cardName,
          cardNumber: s.billing.cardNumber,
          billingZip: s.billing.billingZip,
        }
        s.billing.dirty = !deepEqual(soft, saved)
        s.billing.savedAt = new Date().toISOString()
      })
    } finally {
      set((s) => {
        s.billing.saving = false
      })
    }
  }
}
