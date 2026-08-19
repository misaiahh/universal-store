import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore, appStore } from './appStore'
import { pageState, seedSession, seedPageClean } from '../test/storeTestUtils'
import { putPageForm } from '../api/dynamoClient'
import type { CompanyForm } from './pages'

// dynamoClient is mocked globally in src/test/setup.ts.

const COMPANY: CompanyForm = {
  companyName: 'Analytical Engines Ltd',
  industry: 'Computing',
  employees: 42,
}

// These tests exercise the store the way components/hooks do — through the
// vanilla store API (subscribe + selectors) and the generated appStore.use.*
// selectors — without rendering React. This is the "no Testing Library" seam:
// selector identity/equality is what drives component re-renders in the app.
describe('store interaction (selectors + subscriptions)', () => {
  beforeEach(() => {
    seedSession()
    seedPageClean('company', COMPANY)
  })

  describe('selector subscriptions', () => {
    it('notifies a dirty subscriber when a field is staged', () => {
      const seen: boolean[] = []
      const unsub = useAppStore.subscribe((s) => {
        seen.push(s.company.dirty)
      })

      pageState('company').stage('companyName', 'Babbage & Co')
      unsub()

      // The subscriber ran and observed the dirty flag turning true.
      expect(seen).toContain(true)
    })

    it('a scoped selector reads the current field value', () => {
      const select = () => useAppStore.getState().company.form.companyName
      expect(select()).toBe('Analytical Engines Ltd')

      pageState('company').stage('companyName', 'Babbage & Co')

      expect(select()).toBe('Babbage & Co')
    })
  })

  describe('generated appStore.use.* selectors', () => {
    it('exposes one selector hook per top-level store key', () => {
      // createSelectors builds appStore.use.<key>; the company slice is one key.
      expect(typeof appStore.use.company).toBe('function')
      expect(typeof appStore.use.session).toBe('function')
    })
  })

  describe('invoking actions via getState', () => {
    it('drives the data layer when a page action runs', async () => {
      // Store actions live on immer-produced (non-configurable) state, so we
      // assert the observable effect of persist() — the mocked data-layer call —
      // rather than spying on the store method itself.
      vi.mocked(putPageForm).mockResolvedValue({
        pk: 'USER#test-session',
        sk: 'company',
        form: COMPANY,
        updatedAt: '2020-01-01T00:00:00.000Z',
      })

      await useAppStore.getState().company.persist()

      expect(putPageForm).toHaveBeenCalledOnce()
      expect(putPageForm).toHaveBeenCalledWith('test-session', 'company', COMPANY)
    })
  })

  describe('cross-page staging', () => {
    it('lets one page mark ANOTHER page dirty without persisting it', () => {
      seedPageClean('billing', {
        cardName: 'Ada',
        cardNumber: '4242',
        billingZip: '90210',
      })
      expect(pageState('billing').dirty).toBe(false)

      // Simulate the documented pattern: drive billing from elsewhere.
      useAppStore.getState().billing.stage('billingZip', '00100')

      expect(pageState('billing').form.billingZip).toBe('00100')
      expect(pageState('billing').dirty).toBe(true)
      // Company (the "current" page) is untouched.
      expect(pageState('company').dirty).toBe(false)
    })
  })
})
