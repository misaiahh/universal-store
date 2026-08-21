import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithStore, screen, fireEvent } from '../test/renderWithStore'
import { seedSession, seedPageClean, pageState } from '../test/storeTestUtils'
import { PreferencesPage } from './PreferencesPage'
import type { PreferencesForm } from '../stores/slices/preferences/types'
// dynamoClient is mocked globally in src/test/setup.ts.
import { putPageForm } from '../api/dynamoClient'

const HARD: PreferencesForm = {
  theme: 'dark',
  newsletter: true,
  language: 'en',
}

// Preferences exercises non-text controls: two <select>s and a checkbox.
describe('<PreferencesPage />', () => {
  beforeEach(() => {
    seedSession()
    seedPageClean('preferences', HARD)
  })

  it('renders the seeded selections', () => {
    renderWithStore(<PreferencesPage />)
    expect(screen.getByLabelText('Theme')).toHaveValue('dark')
    expect(screen.getByLabelText('Language')).toHaveValue('en')
    expect(
      screen.getByLabelText('Subscribe to newsletter'),
    ).toBeChecked()
  })

  it('changing a select stages it and flips dirty', () => {
    renderWithStore(<PreferencesPage />)

    fireEvent.change(screen.getByLabelText('Language'), {
      target: { value: 'fr' },
    })

    expect(pageState('preferences').language).toBe('fr')
    expect(pageState('preferences').dirty).toBe(true)
    expect(screen.getByText('● Unsaved changes')).toBeInTheDocument()
  })

  it('toggling the checkbox stages the boolean', () => {
    renderWithStore(<PreferencesPage />)

    fireEvent.click(screen.getByLabelText('Subscribe to newsletter'))

    expect(pageState('preferences').newsletter).toBe(false)
    expect(pageState('preferences').dirty).toBe(true)
    expect(
      screen.getByLabelText('Subscribe to newsletter'),
    ).not.toBeChecked()
  })

  it('Save calls persist → putPageForm with the staged form', async () => {
    vi.mocked(putPageForm).mockResolvedValue({
      pk: 'USER#test-session',
      sk: 'preferences',
      form: { ...HARD, theme: 'light' },
      updatedAt: '2020-01-01T00:00:00.000Z',
    })
    renderWithStore(<PreferencesPage />)
    fireEvent.change(screen.getByLabelText('Theme'), {
      target: { value: 'light' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save to DynamoDB' }))

    expect(putPageForm).toHaveBeenCalledWith('test-session', 'preferences', {
      ...HARD,
      theme: 'light',
    })
    expect(await screen.findByText(/Saved at /)).toBeInTheDocument()
  })
})
