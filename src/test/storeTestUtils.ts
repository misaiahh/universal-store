import { useAppStore } from '../stores/appStore'
import { PAGE_KEYS, type PageKey, type PageFormData } from '../stores/pages'

// Reusable store helpers for tests. The single source of truth is the live
// `useAppStore`; we never construct a throwaway store, so tests exercise the
// exact middleware chain (persist + immer) the app uses.

// Snapshot of the store's initial state, captured ONCE at module load before any
// test mutates it. `getInitialState()` returns the state produced by the store
// creator (actions + defaults), which is what we restore between tests. This is
// the pattern from the official Zustand testing guide.
const INITIAL_STATE = useAppStore.getInitialState()

// Reset the whole store to its initial state. `replace = true` swaps the entire
// state object (not a shallow merge), so any keys a test added are dropped and
// every slice's form/hard/dirty/status returns to defaults. Actions survive
// because they are part of INITIAL_STATE.
//
// Note: this does NOT mint a sessionId (that normally happens on load via
// ensureSession). Call `seedSession()` when a test needs a stable id.
export function resetAppStore(): void {
  useAppStore.setState(INITIAL_STATE, true)
}

// Give the store a deterministic sessionId so DynamoDB reads/writes in a test
// are keyed predictably. Returns the id for convenience.
export function seedSession(id = 'test-session'): string {
  useAppStore.setState((s) => {
    s.session.sessionId = id
  })
  return id
}

// Seed a page's HARD baseline (last-known DynamoDB value) AND soft form to the
// same value, leaving the page clean (dirty = false) — exactly the state after a
// successful hydrate. Use this to test that a subsequent edit flips dirty.
export function seedPageClean<K extends PageKey>(
  page: K,
  form: PageFormData[K],
): void {
  // Indexing the store by a generic page key yields a UNION of the four slice
  // types, and calling a method on that union collapses its parameter to an
  // intersection of every form shape. The public signature above already pins
  // `form` to the correct page type, so narrow the slice to just the applyForm
  // we need for this key.
  const slice = useAppStore.getState()[page] as {
    applyForm: (form: PageFormData[K]) => void
  }
  slice.applyForm(form)
}

// Read a page slice's current values without a React component.
export function pageState<K extends PageKey>(page: K) {
  return useAppStore.getState()[page]
}

// Convenience: the list of page keys, re-exported so tests don't import from two
// places when iterating every page.
export { PAGE_KEYS }
