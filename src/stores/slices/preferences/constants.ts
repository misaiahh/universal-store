import type { PreferencesForm } from './types'

// The default (empty) preferences form. Lives in its own module so both slice.ts
// (initial state) and the reset action can import it without a slice ⇄ action
// import cycle.
export const emptyForm: PreferencesForm = {
  theme: 'light',
  newsletter: false,
  language: 'en',
}
