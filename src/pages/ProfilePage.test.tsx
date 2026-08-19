import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithStore, screen, fireEvent } from '../test/renderWithStore'
import { seedSession, seedPageClean, pageState } from '../test/storeTestUtils'
import { ProfilePage } from './ProfilePage'
import type { ProfileForm } from '../stores/pages'
// dynamoClient is mocked globally in src/test/setup.ts.
import { putPageForm } from '../api/dynamoClient'

const HARD: ProfileForm = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  address: { street: '12 Analytical Way', city: 'London', zip: 'EC1A' },
  phones: [
    { label: 'mobile', number: '555-0100' },
    { label: 'work', number: '555-0199' },
  ],
}

// Profile renders the two non-flat shapes: a nested address object and a dynamic
// phones array. These tests drive the array add/remove/edit through the UI and
// assert both the store state and the rendered rows.
describe('<ProfilePage />', () => {
  beforeEach(() => {
    seedSession()
    seedPageClean('profile', structuredClone(HARD))
  })

  it('renders top-level, nested, and array values', () => {
    renderWithStore(<ProfilePage />)
    expect(screen.getByLabelText('Full name')).toHaveValue(HARD.fullName)
    expect(screen.getByLabelText('Email')).toHaveValue(HARD.email)
    expect(screen.getByLabelText('Street')).toHaveValue(HARD.address.street)
    expect(screen.getByLabelText('City')).toHaveValue(HARD.address.city)
    // Two phone rows, each with a Label + Number input.
    expect(screen.getAllByLabelText('Label')).toHaveLength(2)
    expect(screen.getAllByLabelText('Number')[0]).toHaveValue('555-0100')
  })

  it('editing a nested address field stages it and flips dirty', () => {
    renderWithStore(<ProfilePage />)

    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Rome' },
    })

    expect(pageState('profile').form.address.city).toBe('Rome')
    expect(pageState('profile').dirty).toBe(true)
    expect(screen.getByText('● Unsaved changes')).toBeInTheDocument()
  })

  it('editing a phone number by row index stages that item', () => {
    renderWithStore(<ProfilePage />)

    fireEvent.change(screen.getAllByLabelText('Number')[0], {
      target: { value: '555-0000' },
    })

    expect(pageState('profile').form.phones[0].number).toBe('555-0000')
    expect(pageState('profile').dirty).toBe(true)
  })

  it('Add phone appends a blank row', () => {
    renderWithStore(<ProfilePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Add phone' }))

    expect(pageState('profile').form.phones).toHaveLength(3)
    expect(screen.getAllByLabelText('Label')).toHaveLength(3)
    expect(pageState('profile').dirty).toBe(true)
  })

  it('Remove deletes the row at that index', () => {
    renderWithStore(<ProfilePage />)

    // Two "Remove" buttons, one per phone row; remove the first.
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])

    expect(pageState('profile').form.phones).toEqual([
      { label: 'work', number: '555-0199' },
    ])
    expect(screen.getAllByLabelText('Number')[0]).toHaveValue('555-0199')
    expect(pageState('profile').dirty).toBe(true)
  })

  it('shows the empty-state hint when all phones are removed', () => {
    renderWithStore(<ProfilePage />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])

    expect(pageState('profile').form.phones).toHaveLength(0)
    expect(screen.getByText('No phones yet.')).toBeInTheDocument()
  })

  it('Save calls persist → putPageForm with the nested/array form', async () => {
    const saved = structuredClone(HARD)
    saved.address.city = 'Rome'
    vi.mocked(putPageForm).mockResolvedValue({
      pk: 'USER#test-session',
      sk: 'profile',
      form: saved,
      updatedAt: '2020-01-01T00:00:00.000Z',
    })
    renderWithStore(<ProfilePage />)
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Rome' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save to DynamoDB' }))

    expect(putPageForm).toHaveBeenCalledWith('test-session', 'profile', saved)
    expect(await screen.findByText(/Saved at /)).toBeInTheDocument()
    expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument()
  })
})
