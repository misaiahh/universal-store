import { describe, it, expect, beforeEach } from 'vitest'
import { pageState, seedSession, seedPageClean } from '../../test/storeTestUtils'
import { useAppStore } from '../appStore'
import { PAGE_KEYS } from '../pages'

// dynamoClient is mocked globally in src/test/setup.ts. These tests don't touch
// the network path directly; they cover the session lifecycle (mint/change/reset
// + soft-data wipe), so they only need the store + reset helpers.

// Session slice owns the DynamoDB partition key and the "wipe on session change"
// lifecycle. A changed/reset session must clear every page's soft data.
describe('sessionSlice', () => {
  beforeEach(() => {
    seedSession('session-a')
  })

  describe('ensureSession', () => {
    it('mints an id only when none exists', () => {
      useAppStore.setState((s) => {
        s.session.sessionId = ''
      })
      useAppStore.getState().session.ensureSession()
      expect(useAppStore.getState().session.sessionId).not.toBe('')
    })

    it('is a no-op when an id is already present', () => {
      useAppStore.getState().session.ensureSession()
      expect(useAppStore.getState().session.sessionId).toBe('session-a')
    })
  })

  describe('setSessionId', () => {
    it('wipes all page soft data when the id actually changes', () => {
      seedPageClean('company', {
        companyName: 'X',
        industry: 'Y',
        employees: 1,
      })
      pageState('company').stage('companyName', 'edited')

      useAppStore.getState().session.setSessionId('session-b')

      expect(useAppStore.getState().session.sessionId).toBe('session-b')
      expect(pageState('company').form.companyName).toBe('')
      expect(pageState('company').dirty).toBe(false)
    })

    it('does nothing when the id is unchanged', () => {
      seedPageClean('company', {
        companyName: 'Keep',
        industry: 'Y',
        employees: 1,
      })

      useAppStore.getState().session.setSessionId('session-a')

      expect(pageState('company').form.companyName).toBe('Keep')
    })
  })

  describe('resetSession', () => {
    it('mints a fresh id and wipes every page', () => {
      for (const key of PAGE_KEYS) {
        expect(pageState(key)).toBeDefined()
      }
      pageState('billing').stage('cardName', 'dirty edit')

      useAppStore.getState().session.resetSession()

      expect(useAppStore.getState().session.sessionId).not.toBe('session-a')
      expect(pageState('billing').form.cardName).toBe('')
    })
  })

  describe('wipeSoftData', () => {
    it('resets all pages via each slice reset()', () => {
      pageState('preferences').stage('language', 'fr')
      pageState('profile').stage('fullName', 'Someone')

      useAppStore.getState().session.wipeSoftData()

      // Each page returns to its own empty-form defaults (preferences defaults
      // language to 'en', not '').
      expect(pageState('preferences').form.language).toBe('en')
      expect(pageState('profile').form.fullName).toBe('')
    })
  })
})
