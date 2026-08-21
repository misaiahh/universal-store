import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  pageState,
  pageForm,
  seedSession,
  seedPageClean,
} from '../../../test/storeTestUtils'
import type { ProfileForm } from './types'

// dynamoClient is mocked globally in src/test/setup.ts; import the mocked fn to
// stub its resolved value and assert the persist call.
import { putPageForm } from '../../../api/dynamoClient'

const HARD: ProfileForm = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  address: { street: '12 Analytical Way', city: 'London', zip: 'EC1A' },
  phones: [
    { label: 'mobile', number: '555-0100' },
    { label: 'work', number: '555-0199' },
  ],
}

// Profile is the slice that models NESTED (address) and ARRAY (phones) shapes,
// so it exercises the stage(recipe) overload most heavily.
describe('profileSlice', () => {
  beforeEach(() => {
    seedSession()
    seedPageClean('profile', structuredClone(HARD))
  })

  describe('stage(key, value) on top-level fields', () => {
    it('updates a primitive and flips dirty', () => {
      pageState('profile').stage('email', 'ada@analytical.uk')
      expect(pageState('profile').email).toBe('ada@analytical.uk')
      expect(pageState('profile').dirty).toBe(true)
    })
  })

  describe('stage(recipe) on a nested object', () => {
    it('edits address.city and flips dirty', () => {
      pageState('profile').stage((d) => {
        d.address.city = 'Rome'
      })
      expect(pageState('profile').address.city).toBe('Rome')
      expect(pageState('profile').dirty).toBe(true)
    })

    it('clears dirty when the nested value returns to the hard value', () => {
      pageState('profile').stage((d) => {
        d.address.zip = '00100'
      })
      expect(pageState('profile').dirty).toBe(true)

      pageState('profile').stage((d) => {
        d.address.zip = 'EC1A'
      })
      expect(pageState('profile').dirty).toBe(false)
    })

    it('does not mutate the hard baseline address', () => {
      pageState('profile').stage((d) => {
        d.address.city = 'Rome'
      })
      expect(pageState('profile').hard.address.city).toBe('London')
    })
  })

  describe('stage(recipe) on the phones array', () => {
    it('edits one item field via index', () => {
      pageState('profile').stage((d) => {
        const phone = d.phones[0]
        if (phone) phone.number = '555-0000'
      })
      expect(pageState('profile').phones[0].number).toBe('555-0000')
      expect(pageState('profile').dirty).toBe(true)
    })

    it('appends a phone', () => {
      pageState('profile').stage((d) => {
        d.phones.push({ label: 'home', number: '555-0222' })
      })
      expect(pageState('profile').phones).toHaveLength(3)
      expect(pageState('profile').dirty).toBe(true)
    })

    it('removes a phone by index', () => {
      pageState('profile').stage((d) => {
        d.phones.splice(0, 1)
      })
      expect(pageState('profile').phones).toEqual([
        { label: 'work', number: '555-0199' },
      ])
      expect(pageState('profile').dirty).toBe(true)
    })

    it('clears dirty when a removed-then-readded phone matches exactly', () => {
      const original = structuredClone(HARD.phones[1])
      pageState('profile').stage((d) => {
        d.phones.splice(1, 1)
      })
      expect(pageState('profile').dirty).toBe(true)

      pageState('profile').stage((d) => {
        d.phones.push(original)
      })
      expect(pageState('profile').dirty).toBe(false)
    })
  })

  describe('persist', () => {
    it('hard-saves the current nested/array form and clears dirty', async () => {
      pageState('profile').stage((d) => {
        d.phones.push({ label: 'home', number: '555-0222' })
      })
      const saved = structuredClone(pageForm('profile'))
      vi.mocked(putPageForm).mockResolvedValue({
        pk: 'USER#test-session',
        sk: 'profile',
        form: saved,
        updatedAt: '2020-01-01T00:00:00.000Z',
      })

      await pageState('profile').persist()

      expect(putPageForm).toHaveBeenCalledWith('test-session', 'profile', saved)
      expect(pageState('profile').hard.phones).toHaveLength(3)
      expect(pageState('profile').dirty).toBe(false)
    })
  })
})
