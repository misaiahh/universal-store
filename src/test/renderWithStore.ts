import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

// Thin render helper for component tests. There is NO store Provider to wrap in:
// the app uses a single module-singleton store (useAppStore), which the global
// setup already resets before each test and seeds via storeTestUtils. So a
// component test just renders the element and drives it through screen/fireEvent.
//
// Keeping this as a one-liner (rather than inlining `render`) gives us a single
// place to add wrappers later (e.g. a Router or ErrorBoundary) without touching
// every test file.
export function renderWithStore(ui: ReactElement) {
  return render(ui)
}

// Re-export the RTL surface the tests use so each test imports from one place.
// Per the user's choice we use fireEvent (not user-event) for interactions.
export { screen, fireEvent, within, act, cleanup } from '@testing-library/react'
