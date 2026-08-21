import type { StateCreator } from 'zustand'
import type { AppStore } from '../../../appStore'

// One action factory per file lives in this folder to keep each store ACTION
// separate from the slice DEFINITION (slice.ts). Every factory takes the slice's
// `set`/`get` (the same pair the immer StateCreator hands the slice) and returns
// the bound action, so slice.ts becomes pure wiring: initial state + factory
// calls.
//
// `CompanySet`/`CompanyGet` are the exact `set`/`get` types the company slice
// receives, derived from a StateCreator with the same immer mutator so the
// factories stay in lock-step with how the slice is created (immer draft-mutating
// `set`, whole-store `get`).
type CompanyStateCreator = StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  unknown
>

export type CompanySet = Parameters<CompanyStateCreator>[0]
export type CompanyGet = Parameters<CompanyStateCreator>[1]
