import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { ProfileForm } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'
import { deepEqual } from '../deepEqual'

// Profile page slice — NESTED under the `profile` key on the store. It owns:
//   - `form`  : the SOFT working copy (edited in the UI, persisted to
//     sessionStorage).
//   - `hard`  : the last value known to be in DynamoDB (in-memory only, NOT
//     persisted) — the baseline the soft copy is compared against.
//   - `dirty` : whether soft ≠ hard, i.e. there are unsaved edits. Recomputed on
//     every change to `form`/`hard`.
// Plus load/save status and DynamoDB actions: `applyForm` (set from an
// already-fetched item, used by the top-level bulk hydrate), `hydrate()`
// (refetch JUST this page), `persist()` (hard-save JUST this page), and
// `reset()` (wipe soft+hard back to defaults; called when the session changes).
// DynamoDB reads/writes are keyed by the current session.sessionId.
export interface ProfileSlice {
  form: ProfileForm
  hard: ProfileForm
  dirty: boolean
  saving: boolean
  savedAt: string | null
  hydrating: boolean
  // Soft-write into this page's working copy and recompute dirty. Named `stage`
  // (git-like: stage a change, then `persist()` commits it to DynamoDB). Two
  // forms: set one top-level field, or mutate the draft form directly for
  // nested objects (`address`), arrays (`phones`), or multi-field changes:
  //   stage('email', v)
  //   stage((d) => { d.address.city = v })
  //   stage((d) => { d.phones.push({ label: '', number: '' }) })
  // Because every slice's actions live on the global store, ANOTHER page can call
  // store.profile.stage(...) to stage a change here; leaving it un-persisted just
  // marks this page dirty so the user can come back and persist it.
  stage: {
    <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]): void
    (recipe: (draft: ProfileForm) => void): void
  }
  applyForm: (form: ProfileForm) => void
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  reset: () => void
}

const emptyForm: ProfileForm = {
  fullName: '',
  email: '',
  address: { street: '', city: '', zip: '' },
  phones: [],
}

export const createProfileSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  ProfileSlice
> = (set, get) => ({
  form: emptyForm,
  hard: emptyForm,
  dirty: false,
  saving: false,
  savedAt: null,
  hydrating: false,

  // Single immer-backed soft-write path. Either set one top-level field, or pass
  // a recipe to mutate the draft form directly (nested objects, arrays,
  // multi-field). Recomputes dirty against the unchanged hard baseline, so dirty
  // stays correct for nested/array shapes with no manual spreading.
  stage: (
    keyOrRecipe: keyof ProfileForm | ((draft: ProfileForm) => void),
    value?: ProfileForm[keyof ProfileForm],
  ) =>
    set((s) => {
      if (typeof keyOrRecipe === 'function') {
        keyOrRecipe(s.profile.form)
      } else {
        // Dynamic single-field write. Indexing the draft with a union key
        // narrows the target to `never`, so assign through an unknown-valued
        // record; the public overload keeps callers fully type-checked.
        ;(s.profile.form as Record<string, unknown>)[keyOrRecipe] = value
      }
      s.profile.dirty = !deepEqual(s.profile.form, s.profile.hard)
    }),

  // Loaded from DynamoDB: this value IS the hard baseline, so soft = hard and
  // the page is clean.
  applyForm: (form) =>
    set((s) => {
      s.profile.form = form
      s.profile.hard = form
      s.profile.dirty = false
    }),

  hydrate: async () => {
    set((s) => {
      s.profile.hydrating = true
    })
    try {
      const item = await getPageForm(get().session.sessionId, 'profile')
      set((s) => {
        s.profile.form = item.form
        s.profile.hard = item.form
        s.profile.dirty = false
      })
    } finally {
      set((s) => {
        s.profile.hydrating = false
      })
    }
  },

  persist: async () => {
    set((s) => {
      s.profile.saving = true
    })
    try {
      const saved = get().profile.form
      await putPageForm(get().session.sessionId, 'profile', saved)
      // Hard-saved: the soft copy is now the hard baseline, so dirty clears.
      set((s) => {
        s.profile.hard = saved
        s.profile.dirty = !deepEqual(s.profile.form, saved)
        s.profile.savedAt = new Date().toISOString()
      })
    } finally {
      set((s) => {
        s.profile.saving = false
      })
    }
  },

  reset: () =>
    set((s) => {
      s.profile.form = emptyForm
      s.profile.hard = emptyForm
      s.profile.dirty = false
      s.profile.saving = false
      s.profile.savedAt = null
      s.profile.hydrating = false
    }),
})
