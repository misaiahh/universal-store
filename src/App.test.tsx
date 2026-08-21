import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithStore, screen, fireEvent } from './test/renderWithStore'
import { seedSession, seedPageClean, pageState } from './test/storeTestUtils'
import { useAppStore } from './stores/appStore'
import App from './App'
import type { CompanyForm } from './stores/slices/company/types'
// dynamoClient is mocked globally in src/test/setup.ts.
import { queryPagesByUser } from './api/dynamoClient'

const COMPANY: CompanyForm = {
  companyName: 'Analytical Engines Ltd',
  industry: 'Computing',
  employees: 42,
}

// App is the composition root: page switcher, per-tab dirty dots, header dirty
// summary, session controls, and the hydrate-all toolbar. These tests exercise
// that shell (the individual page bodies are covered in their own files).
describe('<App />', () => {
  beforeEach(() => {
    seedSession('session-a')
    seedPageClean('company', COMPANY)
  })

  it('shows the Profile tab by default and switches tabs on click', () => {
    renderWithStore(<App />)
    // Profile page heading is present initially.
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Company' }))

    expect(screen.getByRole('heading', { name: 'Company' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Profile' }),
    ).not.toBeInTheDocument()
  })

  it('renders the current session id', () => {
    renderWithStore(<App />)
    expect(screen.getByText('session-a')).toBeInTheDocument()
  })

  it('starts with the "All pages saved" summary and no tab dots', () => {
    renderWithStore(<App />)
    expect(screen.getByText('All pages saved')).toBeInTheDocument()
    expect(screen.queryByText('●')).not.toBeInTheDocument()
  })

  it('reflects a dirty page in the header summary and the tab dot', () => {
    renderWithStore(<App />)
    // Stage an edit on the (non-visible) company slice; App subscribes to every
    // page's dirty flag, so the shell must update.
    fireEvent.click(screen.getByRole('button', { name: 'Company' }))
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Babbage & Co' },
    })

    expect(screen.getByText('Unsaved: Company')).toBeInTheDocument()
    // The dot (●) now renders inside the Company tab button.
    expect(screen.getAllByText('●').length).toBeGreaterThan(0)
  })

  it('New session mints a fresh id and wipes soft data', () => {
    renderWithStore(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Company' }))
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Edited' },
    })
    expect(pageState('company').companyName).toBe('Edited')

    fireEvent.click(
      screen.getByRole('button', { name: 'New session (wipes soft data)' }),
    )

    expect(useAppStore.getState().session.sessionId).not.toBe('session-a')
    expect(pageState('company').companyName).toBe('')
  })

  it('Switch sets a typed session id', () => {
    renderWithStore(<App />)

    fireEvent.change(screen.getByPlaceholderText('Set session ID…'), {
      target: { value: 'session-b' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }))

    expect(useAppStore.getState().session.sessionId).toBe('session-b')
    expect(screen.getByText('session-b')).toBeInTheDocument()
  })

  it('Hydrate-all drives queryPagesByUser and shows a hydrated timestamp', async () => {
    vi.mocked(queryPagesByUser).mockResolvedValue([
      {
        pk: 'USER#session-a',
        sk: 'company',
        form: { ...COMPANY, employees: 100 },
        updatedAt: '2020-01-01T00:00:00.000Z',
      },
    ])
    renderWithStore(<App />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Hydrate all pages from DynamoDB' }),
    )

    expect(queryPagesByUser).toHaveBeenCalledWith('session-a')
    expect(await screen.findByText(/Hydrated at /)).toBeInTheDocument()
  })
})
