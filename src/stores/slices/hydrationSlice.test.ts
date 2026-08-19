import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pageState, seedSession } from '../../test/storeTestUtils'
import { useAppStore } from '../appStore'
import type { AnyPageItem } from '../../api/dynamoClient'

// dynamoClient is mocked globally in src/test/setup.ts; import the mocked query
// fn to stub the full-page fetch and assert it was called.
import { queryPagesByUser } from '../../api/dynamoClient'

const ITEMS: AnyPageItem[] = [
  {
    pk: 'USER#test-session',
    sk: 'profile',
    form: {
      fullName: 'Ada',
      email: 'ada@x.io',
      address: { street: '1', city: 'London', zip: 'EC1A' },
      phones: [{ label: 'mobile', number: '555-0100' }],
    },
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    pk: 'USER#test-session',
    sk: 'company',
    form: { companyName: 'Engines', industry: 'Computing', employees: 42 },
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
]

// Top-level hydrate() loads EVERY page at once and fans each item into the
// owning nested slice via applyForm, leaving each page clean.
describe('hydrationSlice', () => {
  beforeEach(() => {
    seedSession()
  })

  it('routes each item to its slice and marks pages clean', async () => {
    vi.mocked(queryPagesByUser).mockResolvedValue(ITEMS)

    await useAppStore.getState().hydrate()

    expect(queryPagesByUser).toHaveBeenCalledWith('test-session')
    expect(pageState('profile').form.fullName).toBe('Ada')
    expect(pageState('profile').dirty).toBe(false)
    expect(pageState('company').form.companyName).toBe('Engines')
    expect(pageState('company').dirty).toBe(false)
    expect(useAppStore.getState().hydratedAt).not.toBeNull()
  })

  it('records an error message and clears hydrating on failure', async () => {
    vi.mocked(queryPagesByUser).mockRejectedValue(new Error('boom'))

    await useAppStore.getState().hydrate()

    expect(useAppStore.getState().hydrationError).toBe('boom')
    expect(useAppStore.getState().hydrating).toBe(false)
  })

  it('is re-entrancy guarded (ignores a call while already hydrating)', async () => {
    useAppStore.setState((s) => {
      s.hydrating = true
    })

    await useAppStore.getState().hydrate()

    // Guard returned early, so the data layer was never hit.
    expect(queryPagesByUser).not.toHaveBeenCalled()
  })
})
