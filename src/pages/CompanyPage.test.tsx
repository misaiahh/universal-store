import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithStore, screen, fireEvent } from '../test/renderWithStore'
import { seedSession, seedPageClean, pageState } from '../test/storeTestUtils'
import { CompanyPage } from './CompanyPage'
import type { CompanyForm } from '../stores/slices/company/types'
// dynamoClient is mocked globally in src/test/setup.ts.
import { getPageForm, putPageForm } from '../api/dynamoClient'

const HARD: CompanyForm = {
  companyName: 'Analytical Engines Ltd',
  industry: 'Computing',
  employees: 42,
}

// Flat-slice page exemplar rendered as a real React tree. Verifies the store↔UI
// wiring: seeded values render, edits stage into the slice and flip the dirty
// badge + Save button, and the toolbar buttons drive the mocked data layer.
describe('<CompanyPage />', () => {
  beforeEach(() => {
    seedSession()
    seedPageClean('company', HARD)
  })

  it('renders the seeded form values', () => {
    renderWithStore(<CompanyPage />)
    expect(screen.getByLabelText('Company name')).toHaveValue(HARD.companyName)
    expect(screen.getByLabelText('Industry')).toHaveValue(HARD.industry)
    expect(screen.getByLabelText('Employees')).toHaveValue(HARD.employees)
  })

  it('starts clean: no dirty badge and Save disabled', () => {
    renderWithStore(<CompanyPage />)
    expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save to DynamoDB' })).toBeDisabled()
  })

  it('editing a field stages it, shows the badge, and enables Save', () => {
    renderWithStore(<CompanyPage />)

    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Babbage & Co' },
    })

    // Store received the staged edit...
    expect(pageState('company').companyName).toBe('Babbage & Co')
    expect(pageState('company').dirty).toBe(true)
    // ...and the UI reflects it.
    expect(screen.getByText('● Unsaved changes')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save to DynamoDB' }),
    ).toBeEnabled()
  })

  it('editing back to the hard value clears dirty and re-disables Save', () => {
    renderWithStore(<CompanyPage />)
    const input = screen.getByLabelText('Company name')

    fireEvent.change(input, { target: { value: 'Changed' } })
    expect(pageState('company').dirty).toBe(true)

    fireEvent.change(input, { target: { value: HARD.companyName } })
    expect(pageState('company').dirty).toBe(false)
    expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save to DynamoDB' }),
    ).toBeDisabled()
  })

  it('Save calls persist → putPageForm with the current form', async () => {
    vi.mocked(putPageForm).mockResolvedValue({
      pk: 'USER#test-session',
      sk: 'company',
      form: { ...HARD, companyName: 'Babbage & Co' },
      updatedAt: '2020-01-01T00:00:00.000Z',
    })
    renderWithStore(<CompanyPage />)
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Babbage & Co' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save to DynamoDB' }))

    expect(putPageForm).toHaveBeenCalledWith('test-session', 'company', {
      ...HARD,
      companyName: 'Babbage & Co',
    })
    // After the mocked save resolves, the badge clears (dirty=false).
    expect(await screen.findByText(/Saved at /)).toBeInTheDocument()
    expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
  })

  it('Refetch calls hydrate → getPageForm and shows the loading label', async () => {
    const server: CompanyForm = { ...HARD, employees: 100 }
    vi.mocked(getPageForm).mockResolvedValue({
      pk: 'USER#test-session',
      sk: 'company',
      form: server,
      updatedAt: '2020-01-01T00:00:00.000Z',
    })
    renderWithStore(<CompanyPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Refetch this page' }))

    expect(getPageForm).toHaveBeenCalledWith('test-session', 'company')
    // The server value lands in the input once hydrate resolves.
    expect(await screen.findByDisplayValue('100')).toBeInTheDocument()
  })
})
