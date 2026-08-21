import type { CompanyForm } from '../types'
import { putPageForm } from '../../../../api/dynamoClient'
import { deepEqual } from '../../../deepEqual'
import type { CompanySet, CompanyGet } from './types'

// Hard-save JUST this page to DynamoDB. Gathers the current soft fields, writes
// them, then promotes that value to the hard baseline so dirty clears.
export function createPersist(
  set: CompanySet,
  get: CompanyGet,
): () => Promise<void> {
  return async () => {
    set((s) => {
      s.company.saving = true
    })
    try {
      const c = get().company
      const saved: CompanyForm = {
        companyName: c.companyName,
        industry: c.industry,
        employees: c.employees,
      }
      await putPageForm(get().session.sessionId, 'company', saved)
      // Hard-saved: the soft copy is now the hard baseline, so dirty clears.
      set((s) => {
        s.company.hard = saved
        const soft: CompanyForm = {
          companyName: s.company.companyName,
          industry: s.company.industry,
          employees: s.company.employees,
        }
        s.company.dirty = !deepEqual(soft, saved)
        s.company.savedAt = new Date().toISOString()
      })
    } finally {
      set((s) => {
        s.company.saving = false
      })
    }
  }
}
