import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithStore, screen, fireEvent } from '../test/renderWithStore'
import { seedSession, seedPageClean, pageState } from '../test/storeTestUtils'
import { BillingPage } from './BillingPage'
import type { BillingForm } from '../stores/pages'
// dynamoClient is mocked globally in src/test/setup.ts.
import { putPageForm } from '../api/dynamoClient'

const HARD: BillingForm = {
  cardName: 'Ada Lovelace',
  cardNumber: '4242 4242 4242 4242',
  billingZip: '90210',
}

describe('<BillingPage />', () => {
  beforeEach(() => {
    seedSession()
    seedPageClean('billing', HARD)
  })

  it('renders the seeded form values', () => {
    renderWithStore(<BillingPage />)
    expect(screen.getByLabelText('Name on card')).toHaveValue(HARD.cardName)
    expect(screen.getByLabelText('Card number')).toHaveValue(HARD.cardNumber)
    expect(screen.getByLabelText('Billing ZIP')).toHaveValue(HARD.billingZip)
  })

  it('starts clean with Save disabled', () => {
    renderWithStore(<BillingPage />)
    expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save to DynamoDB' }),
    ).toBeDisabled()
  })

  it('editing a field stages it and flips dirty + Save', () => {
    renderWithStore(<BillingPage />)

    fireEvent.change(screen.getByLabelText('Billing ZIP'), {
      target: { value: '00100' },
    })

    expect(pageState('billing').form.billingZip).toBe('00100')
    expect(pageState('billing').dirty).toBe(true)
    expect(screen.getByText('● Unsaved changes')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save to DynamoDB' }),
    ).toBeEnabled()
  })

  it('Save calls persist → putPageForm and clears the badge', async () => {
    vi.mocked(putPageForm).mockResolvedValue({
      pk: 'USER#test-session',
      sk: 'billing',
      form: { ...HARD, billingZip: '00100' },
      updatedAt: '2020-01-01T00:00:00.000Z',
    })
    renderWithStore(<BillingPage />)
    fireEvent.change(screen.getByLabelText('Billing ZIP'), {
      target: { value: '00100' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save to DynamoDB' }))

    expect(putPageForm).toHaveBeenCalledWith('test-session', 'billing', {
      ...HARD,
      billingZip: '00100',
    })
    expect(await screen.findByText(/Saved at /)).toBeInTheDocument()
    expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
  })
})
