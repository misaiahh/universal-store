import type { StateCreator } from 'zustand'
import type { AppStore } from '../../../appStore'

// One action factory per file lives in this folder to keep each store ACTION
// separate from the slice DEFINITION (slice.ts). Every factory takes the slice's
// `set`/`get` (the same pair the immer StateCreator hands the slice) and returns
// the bound action, so slice.ts becomes pure wiring: initial state + factory
// calls.
//
// `ProfileSet`/`ProfileGet` are the exact `set`/`get` types the profile slice
// receives, derived from a StateCreator with the same immer mutator so the
// factories stay in lock-step with how the slice is created (immer draft-mutating
// `set`, whole-store `get`).
type ProfileStateCreator = StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  unknown
>

export type ProfileSet = Parameters<ProfileStateCreator>[0]
export type ProfileGet = Parameters<ProfileStateCreator>[1]
