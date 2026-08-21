import { emptyForm } from '../constants'
import type { CompanySet } from './types'

// Wipe soft + hard back to defaults and clear all status. Called when the
// session changes so a new session never sees the previous one's data.
export function createReset(set: CompanySet): () => void {
  return () =>
    set((s) => {
      s.company.companyName = emptyForm.companyName
      s.company.industry = emptyForm.industry
      s.company.employees = emptyForm.employees
      s.company.hard = emptyForm
      s.company.dirty = false
      s.company.saving = false
      s.company.savedAt = null
      s.company.hydrating = false
    })
}
