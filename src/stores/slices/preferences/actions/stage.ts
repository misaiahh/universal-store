import type { PreferencesForm } from '../types'
import { deepEqual } from '../../../deepEqual'
import type { PreferencesSet } from './types'

// Single immer-backed soft-write path. Either set one top-level field, or pass a
// recipe to mutate the draft fields directly (multi-field). Recomputes dirty
// against the unchanged hard baseline.
export interface Stage {
  <K extends keyof PreferencesForm>(key: K, value: PreferencesForm[K]): void
  (recipe: (draft: PreferencesForm) => void): void
}

export function createStage(set: PreferencesSet): Stage {
  return (
    keyOrRecipe: keyof PreferencesForm | ((draft: PreferencesForm) => void),
    value?: PreferencesForm[keyof PreferencesForm],
  ) =>
    set((s) => {
      if (typeof keyOrRecipe === 'function') {
        // The recipe mutates the flat form fields, which now live on the slice
        // root; cast the slice draft to the form type so callers stay checked.
        keyOrRecipe(s.preferences as unknown as PreferencesForm)
      } else {
        // Dynamic single-field write. Indexing the draft with a union key
        // narrows the target to `never`, so assign through an unknown-valued
        // record; the public overload keeps callers fully type-checked.
        ;(s.preferences as Record<string, unknown>)[keyOrRecipe] = value
      }
      const soft: PreferencesForm = {
        theme: s.preferences.theme,
        newsletter: s.preferences.newsletter,
        language: s.preferences.language,
      }
      s.preferences.dirty = !deepEqual(soft, s.preferences.hard)
    })
}
