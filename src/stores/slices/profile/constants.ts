import type { ProfileForm } from './types'

// The default (empty) profile form. Lives in its own module so both slice.ts
// (initial state) and the reset action can import it without a slice ⇄ action
// import cycle.
export const emptyForm: ProfileForm = {
  fullName: '',
  email: '',
  address: { street: '', city: '', zip: '' },
  phones: [],
}
