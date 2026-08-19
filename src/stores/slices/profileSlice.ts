import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import type { ProfileForm, ProfileActivity } from '../pages'
import { getPageForm, putPageForm } from '../../api/dynamoClient'
import { queryProfileActivity } from '../../api/profileActivity'
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

  // --- Direct @apollo/client query examples (read-only profile enrichment) ---
  // These are NOT part of the soft/hard/dirty form model above; they demonstrate
  // the two ways a GraphQL query is wired against an immer store. Both hit the
  // same `profileActivity` query, whose result Apollo deep-FREEZES.
  //
  // The returned tree being frozen is the whole point: immer's `set` can store a
  // frozen object as an opaque leaf, but the moment a later recipe tries to MUTATE
  // that stored subtree in place (e.g. push an event, edit metadata) immer throws,
  // because it never took ownership of a frozen foreign object. So anything we
  // want to keep in the draft AND remain mutable must be structuredClone'd first.
  activity: ProfileActivity | null
  activityLoading: boolean
  activityError: string | null
  // Type 1 — LAZY, side-effecting. A component/hook triggers it; it drives
  // activityLoading/activityError and writes the result INTO the store. The
  // Apollo result is structuredClone'd so immer owns a mutable copy that future
  // `stage`-style recipes can safely mutate. Returns nothing.
  loadActivity: () => Promise<void>
  // Type 2 — RETURNS DIRECTLY. A pure async read: it performs the query and hands
  // the (frozen) Apollo result straight back to the caller. It touches the store
  // not at all, so there is no immer interaction and nothing to clone here —
  // the caller owns whatever it does with the frozen tree.
  fetchActivity: () => Promise<ProfileActivity>
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
  activity: null,
  activityLoading: false,
  activityError: null,

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
      s.profile.activity = null
      s.profile.activityLoading = false
      s.profile.activityError = null
    }),

  // Type 1 — lazy query that writes into the store. Loading/error live in the
  // slice, and the result is stored for any component reading `profile.activity`.
  // The critical line is the structuredClone: `data` is Apollo-frozen, and
  // assigning it straight into the immer draft would leave a frozen subtree that
  // any later mutating recipe could not touch. Cloning hands immer a plain,
  // mutable copy it fully owns.
  loadActivity: async () => {
    if (get().profile.activityLoading) return
    set((s) => {
      s.profile.activityLoading = true
      s.profile.activityError = null
    })
    try {
      const data = await queryProfileActivity(get().session.sessionId)
      set((s) => {
        s.profile.activity = structuredClone(data)
      })
    } catch (err) {
      set((s) => {
        s.profile.activityError =
          err instanceof Error ? err.message : String(err)
      })
    } finally {
      set((s) => {
        s.profile.activityLoading = false
      })
    }
  },

  // Type 2 — pure query that returns its result. No `set`, no loading/error
  // tracking, nothing stored: the frozen Apollo tree is handed straight back for
  // the caller to consume. Because it never enters an immer draft, there is no
  // clone and no freezing conflict — the store is entirely uninvolved.
  fetchActivity: async () => {
    return await queryProfileActivity(get().session.sessionId)
  },
})
