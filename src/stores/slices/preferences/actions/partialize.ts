import type { PreferencesForm } from '../types'
import type { PreferencesGet } from './types'

// Return the slice's flat SOFT fields as a whole PreferencesForm object. This is
// the value the root store persists to sessionStorage (see appStore partialize)
// and the value reconcileHardWithSoft feeds back into `apply` after a refresh.
// Owning its own persisted shape here means the root store never has to know how
// the preferences fields are laid out.
export function createPartialize(get: PreferencesGet): () => PreferencesForm {
  return () => {
    const p = get().preferences
    return {
      theme: p.theme,
      newsletter: p.newsletter,
      language: p.language,
    }
  }
}
