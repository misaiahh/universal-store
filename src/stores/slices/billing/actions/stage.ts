import type { BillingForm } from '../types'
import { deepEqual } from '../../../deepEqual'
import type { BillingSet } from './types'

// Single immer-backed soft-write path. Either set one top-level field, or pass a
// recipe to mutate the draft fields directly (multi-field). Recomputes dirty
// against the unchanged hard baseline.
export interface Stage {
  <K extends keyof BillingForm>(key: K, value: BillingForm[K]): void
  (recipe: (draft: BillingForm) => void): void
}

export function createStage(set: BillingSet): Stage {
  return (
    keyOrRecipe: keyof BillingForm | ((draft: BillingForm) => void),
    value?: BillingForm[keyof BillingForm],
  ) =>
    set((s) => {
      if (typeof keyOrRecipe === 'function') {
        // The recipe mutates the flat form fields, which now live on the slice
        // root; cast the slice draft to the form type so callers stay checked.
        keyOrRecipe(s.billing as unknown as BillingForm)
      } else {
        // Dynamic single-field write. Indexing the draft with a union key
        // narrows the target to `never`, so assign through an unknown-valued
        // record; the public overload keeps callers fully type-checked.
        ;(s.billing as Record<string, unknown>)[keyOrRecipe] = value
      }
      const soft: BillingForm = {
        cardName: s.billing.cardName,
        cardNumber: s.billing.cardNumber,
        billingZip: s.billing.billingZip,
      }
      s.billing.dirty = !deepEqual(soft, s.billing.hard)
    })
}
