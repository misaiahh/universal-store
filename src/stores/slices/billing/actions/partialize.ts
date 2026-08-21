import type { BillingForm } from '../types'
import type { BillingGet } from './types'

// Return the slice's flat SOFT fields as a whole BillingForm object. This is the
// value the root store persists to sessionStorage (see appStore partialize) and
// the value reconcileHardWithSoft feeds back into `apply` after a refresh. Owning
// its own persisted shape here means the root store never has to know how the
// billing fields are laid out.
export function createPartialize(get: BillingGet): () => BillingForm {
  return () => {
    const b = get().billing
    return {
      cardName: b.cardName,
      cardNumber: b.cardNumber,
      billingZip: b.billingZip,
    }
  }
}
