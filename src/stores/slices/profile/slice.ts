import type { StateCreator } from 'zustand'
import type { AppStore } from '../../appStore'
import { emptyForm } from './constants'
import type { ProfileSlice } from './types'
import { createStage } from './actions/stage'
import { createApply } from './actions/apply'
import { createHydrate } from './actions/hydrate'
import { createPersist } from './actions/persist'
import { createReset } from './actions/reset'
import { createPartialize } from './actions/partialize'
import { createLoadActivity } from './actions/loadActivity'
import { createFetchActivity } from './actions/fetchActivity'

// Re-export the slice SHAPE so existing `from './slices/profile/slice'` imports
// (e.g. appStore.ts) keep resolving `ProfileSlice`; its definition lives in
// ./types to keep interfaces separate from the slice DEFINITION below.
export type { ProfileSlice } from './types'

// Profile page slice — DEFINITION only. Its public shape lives in ./types and
// each action lives in its own file under ./actions, so this file is pure
// wiring: initial state + action factory calls. See ./types for the field/verb
// docs and ./actions for each verb's behaviour.
export const createProfileSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  ProfileSlice
> = (set, get) => ({
  ...emptyForm,
  hard: emptyForm,
  dirty: false,
  saving: false,
  savedAt: null,
  hydrating: false,
  activity: null,
  activityLoading: false,
  activityError: null,

  stage: createStage(set),
  apply: createApply(set),
  hydrate: createHydrate(set, get),
  persist: createPersist(set, get),
  reset: createReset(set),
  partialize: createPartialize(get),
  loadActivity: createLoadActivity(set, get),
  fetchActivity: createFetchActivity(get),
})
