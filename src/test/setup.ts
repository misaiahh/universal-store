import { afterEach, beforeEach, vi } from 'vitest'

// Mock the async data layer GLOBALLY, here in the setup file, rather than in each
// test. This is REQUIRED, not just convenient: setup.ts imports the store below,
// which transitively loads every slice and therefore `dynamoClient` into the
// module cache. Per Vitest, a `vi.mock` in a test file is silently ignored once
// the target module is already cached by the setup phase — so the mock must be
// declared here, before that transitive import runs. Tests set per-case
// behaviour via `vi.mocked(getPageForm).mockResolvedValue(...)` etc.
vi.mock('../api/dynamoClient', () => ({
  getPageForm: vi.fn(),
  putPageForm: vi.fn(),
  queryPagesByUser: vi.fn(),
}))

import { resetAppStore } from './storeTestUtils'

// Global test setup (referenced by vite.config.ts `test.setupFiles`).
//
// The store is a MODULE SINGLETON, so state leaks across tests unless reset.
// Best practice for global Zustand stores is to restore initial state before
// every test; we also clear sessionStorage because the persist middleware writes
// there on every mutation and would otherwise rehydrate stale soft data.
beforeEach(() => {
  // Reset dynamoClient mock call history + implementations so each test starts
  // from a clean slate (removes the need for per-file vi.clearAllMocks()).
  vi.clearAllMocks()
  sessionStorage.clear()
  resetAppStore()
})

// Clear again afterwards so a test's writes never bleed into unrelated code that
// reads storage during teardown.
afterEach(() => {
  sessionStorage.clear()
})
