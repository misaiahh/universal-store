import type { CompanyForm } from '../types'
import type { CompanySet } from './types'

// Loaded from DynamoDB: this value IS the hard baseline, so soft = hard and the
// page is clean. Used by the top-level bulk hydrate (hydrationSlice) and by
// reconcileHardWithSoft on rehydration.
export function createApply(set: CompanySet): (form: CompanyForm) => void {
  return (form) =>
    set((s) => {
      s.company.companyName = form.companyName
      s.company.industry = form.industry
      s.company.employees = form.employees
      s.company.hard = form
      s.company.dirty = false
    })
}
