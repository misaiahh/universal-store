import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'
import { pageState, seedSession, seedPageClean } from '../../test/storeTestUtils'
import type { CompanyForm } from '../pages'

// The async data layer is mocked GLOBALLY in src/test/setup.ts (it has to be —
// the store is loaded transitively during setup, which caches dynamoClient and
// makes a per-file vi.mock a no-op). We just import the mocked fns here to drive
// per-test behaviour and assert calls; call history is cleared before each test.
import { getPageForm, putPageForm } from '../../api/dynamoClient'

const HARD: CompanyForm = {
  companyName: 'Analytical Engines Ltd',
  industry: 'Computing',
  employees: 42,
}

// Flat slice exemplar. profileSlice covers nested/array cases; the mechanics
// (stage overloads, dirty transitions, persist/hydrate/reset) are identical.
describe('companySlice', () => {
  beforeEach(() => {
    seedSession()
  })

  describe('stage(key, value)', () => {
    it('writes one field and flips dirty when it differs from hard', () => {
      seedPageClean('company', HARD)
      expect(pageState('company').dirty).toBe(false)

      pageState('company').stage('companyName', 'Babbage & Co')

      expect(pageState('company').form.companyName).toBe('Babbage & Co')
      expect(pageState('company').dirty).toBe(true)
    })

    it('clears dirty when a field is edited back to its hard value', () => {
      seedPageClean('company', HARD)
      pageState('company').stage('industry', 'Textiles')
      expect(pageState('company').dirty).toBe(true)

      pageState('company').stage('industry', HARD.industry)

      expect(pageState('company').dirty).toBe(false)
    })

    it('does not mutate the hard baseline', () => {
      seedPageClean('company', HARD)
      pageState('company').stage('employees', 99)
      expect(pageState('company').hard.employees).toBe(42)
    })
  })

  describe('stage(recipe)', () => {
    it('applies a multi-field draft mutation in one dirty recompute', () => {
      seedPageClean('company', HARD)

      pageState('company').stage((d) => {
        d.companyName = 'Babbage & Co'
        d.employees = 7
      })

      expect(pageState('company').form).toEqual({
        companyName: 'Babbage & Co',
        industry: 'Computing',
        employees: 7,
      })
      expect(pageState('company').dirty).toBe(true)
    })
  })

  describe('persist', () => {
    it('sends the current form and updates hard + savedAt, clearing dirty', async () => {
      vi.mocked(putPageForm).mockResolvedValue({
        pk: 'USER#test-session',
        sk: 'company',
        form: HARD,
        updatedAt: '2020-01-01T00:00:00.000Z',
      })
      seedPageClean('company', HARD)
      pageState('company').stage('companyName', 'Babbage & Co')

      await pageState('company').persist()

      expect(putPageForm).toHaveBeenCalledWith('test-session', 'company', {
        ...HARD,
        companyName: 'Babbage & Co',
      })
      expect(pageState('company').hard.companyName).toBe('Babbage & Co')
      expect(pageState('company').dirty).toBe(false)
      expect(pageState('company').savedAt).not.toBeNull()
    })

    it('resets the saving flag even if the mutation rejects', async () => {
      vi.mocked(putPageForm).mockRejectedValue(new Error('network'))
      seedPageClean('company', HARD)

      await expect(pageState('company').persist()).rejects.toThrow('network')
      expect(pageState('company').saving).toBe(false)
    })
  })

  describe('hydrate', () => {
    it('loads the server form as the new clean baseline', async () => {
      const server: CompanyForm = { ...HARD, employees: 100 }
      vi.mocked(getPageForm).mockResolvedValue({
        pk: 'USER#test-session',
        sk: 'company',
        form: server,
        updatedAt: '2020-01-01T00:00:00.000Z',
      })

      await pageState('company').hydrate()

      expect(getPageForm).toHaveBeenCalledWith('test-session', 'company')
      expect(pageState('company').form).toEqual(server)
      expect(pageState('company').hard).toEqual(server)
      expect(pageState('company').dirty).toBe(false)
    })
  })

  describe('reset', () => {
    it('wipes soft + hard back to empty and clears status', () => {
      seedPageClean('company', HARD)
      pageState('company').stage('companyName', 'x')
      useAppStore.setState((s) => {
        s.company.savedAt = '2020-01-01T00:00:00.000Z'
      })

      pageState('company').reset()

      expect(pageState('company').form).toEqual({
        companyName: '',
        industry: '',
        employees: 0,
      })
      expect(pageState('company').dirty).toBe(false)
      expect(pageState('company').savedAt).toBeNull()
    })
  })
})
