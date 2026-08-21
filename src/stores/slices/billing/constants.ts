import type { BillingForm } from './types'

// The default (empty) billing form. Lives in its own module so both slice.ts
// (initial state) and the reset action can import it without a slice ⇄ action
// import cycle.
export const emptyForm: BillingForm = {
  cardName: '',
  cardNumber: '',
  billingZip: '',
}
