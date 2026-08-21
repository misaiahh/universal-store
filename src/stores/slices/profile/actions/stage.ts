import type { ProfileForm } from '../types'
import { deepEqual } from '../../../deepEqual'
import type { ProfileSet } from './types'

// Single immer-backed soft-write path. Either set one top-level field, or pass a
// recipe to mutate the draft fields directly (nested objects, arrays,
// multi-field). Recomputes dirty against the unchanged hard baseline, so dirty
// stays correct for nested/array shapes with no manual spreading.
export interface Stage {
  <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]): void
  (recipe: (draft: ProfileForm) => void): void
}

export function createStage(set: ProfileSet): Stage {
  return (
    keyOrRecipe: keyof ProfileForm | ((draft: ProfileForm) => void),
    value?: ProfileForm[keyof ProfileForm],
  ) =>
    set((s) => {
      if (typeof keyOrRecipe === 'function') {
        // The recipe mutates the flat form fields, which now live on the slice
        // root; cast the slice draft to the form type so callers stay checked.
        keyOrRecipe(s.profile as unknown as ProfileForm)
      } else {
        // Dynamic single-field write. Indexing the draft with a union key
        // narrows the target to `never`, so assign through an unknown-valued
        // record; the public overload keeps callers fully type-checked.
        ;(s.profile as Record<string, unknown>)[keyOrRecipe] = value
      }
      const soft: ProfileForm = {
        fullName: s.profile.fullName,
        email: s.profile.email,
        address: s.profile.address,
        phones: s.profile.phones,
      }
      s.profile.dirty = !deepEqual(soft, s.profile.hard)
    })
}
