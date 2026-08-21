import type { CompanyForm } from '../types'
import type { CompanyGet } from './types'

// Return the slice's flat SOFT fields as a whole CompanyForm object. This is the
// value the root store persists to sessionStorage (see appStore partialize) and
// the value reconcileHardWithSoft feeds back into `apply` after a refresh. Owning
// its own persisted shape here means the root store never has to know how the
// company fields are laid out.
export function createPartialize(get: CompanyGet): () => CompanyForm {
  return () => {
    const c = get().company
    return {
      companyName: c.companyName,
      industry: c.industry,
      employees: c.employees,
    }
  }
}
