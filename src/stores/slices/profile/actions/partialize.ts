import type { ProfileForm } from '../types'
import type { ProfileGet } from './types'

// Return the slice's flat SOFT fields as a whole ProfileForm object. This is the
// value the root store persists to sessionStorage (see appStore partialize) and
// the value reconcileHardWithSoft feeds back into `apply` after a refresh. Owning
// its own persisted shape here means the root store never has to know how the
// profile fields are laid out.
export function createPartialize(get: ProfileGet): () => ProfileForm {
  return () => {
    const p = get().profile
    return {
      fullName: p.fullName,
      email: p.email,
      address: p.address,
      phones: p.phones,
    }
  }
}
