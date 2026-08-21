import { getPageForm } from '../../../../api/dynamoClient'
import type { CompanySet, CompanyGet } from './types'

// Refetch JUST this page from DynamoDB (keyed by the current session.sessionId).
// The fetched value becomes both soft and hard, so the page lands clean.
export function createHydrate(
  set: CompanySet,
  get: CompanyGet,
): () => Promise<void> {
  return async () => {
    set((s) => {
      s.company.hydrating = true
    })
    try {
      const item = await getPageForm(get().session.sessionId, 'company')
      set((s) => {
        s.company.companyName = item.form.companyName
        s.company.industry = item.form.industry
        s.company.employees = item.form.employees
        s.company.hard = item.form
        s.company.dirty = false
      })
    } finally {
      set((s) => {
        s.company.hydrating = false
      })
    }
  }
}
