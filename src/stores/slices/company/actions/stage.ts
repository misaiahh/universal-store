import type { CompanyForm } from '../types'
import { deepEqual } from '../../../deepEqual'
import type { CompanySet } from './types'

// Single immer-backed soft-write path. Either set one top-level field, or pass a
// recipe to mutate the draft fields directly (multi-field). Recomputes dirty
// against the unchanged hard baseline.
export interface Stage {
  <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]): void
  (recipe: (draft: CompanyForm) => void): void
}

export function createStage(set: CompanySet): Stage {
  return (
    keyOrRecipe: keyof CompanyForm | ((draft: CompanyForm) => void),
    value?: CompanyForm[keyof CompanyForm],
  ) =>
    set((s) => {
      if (typeof keyOrRecipe === 'function') {
        // The recipe mutates the flat form fields, which now live on the slice
        // root; cast the slice draft to the form type so callers stay checked.
        keyOrRecipe(s.company as unknown as CompanyForm)
      } else {
        // Dynamic single-field write. Indexing the draft with a union key
        // narrows the target to `never`, so assign through an unknown-valued
        // record; the public overload keeps callers fully type-checked.
        ;(s.company as Record<string, unknown>)[keyOrRecipe] = value
      }
      const soft: CompanyForm = {
        companyName: s.company.companyName,
        industry: s.company.industry,
        employees: s.company.employees,
      }
      s.company.dirty = !deepEqual(soft, s.company.hard)
    })
}
