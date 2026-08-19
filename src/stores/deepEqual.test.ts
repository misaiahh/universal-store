import { describe, it, expect } from 'vitest'
import { deepEqual } from './deepEqual'

// deepEqual backs the `dirty` flag: soft form vs hard snapshot. These tests pin
// the exact shapes our forms use (primitives, nested objects, arrays) plus the
// edge cases that would silently break dirty tracking if they regressed.
describe('deepEqual', () => {
  describe('primitives', () => {
    it('treats identical primitives as equal', () => {
      expect(deepEqual(1, 1)).toBe(true)
      expect(deepEqual('a', 'a')).toBe(true)
      expect(deepEqual(true, true)).toBe(true)
      expect(deepEqual(null, null)).toBe(true)
      expect(deepEqual(undefined, undefined)).toBe(true)
    })

    it('treats differing primitives as not equal', () => {
      expect(deepEqual(1, 2)).toBe(false)
      expect(deepEqual('a', 'b')).toBe(false)
      expect(deepEqual(true, false)).toBe(false)
    })

    it('does not coerce across types', () => {
      expect(deepEqual(1, '1')).toBe(false)
      expect(deepEqual(0, false)).toBe(false)
      expect(deepEqual('', null)).toBe(false)
    })

    it('distinguishes null from a non-null object', () => {
      expect(deepEqual(null, {})).toBe(false)
      expect(deepEqual({}, null)).toBe(false)
    })
  })

  describe('nested objects', () => {
    it('recurses into equal nested objects', () => {
      const a = { address: { street: '1 Main', city: 'Rome', zip: '00100' } }
      const b = { address: { street: '1 Main', city: 'Rome', zip: '00100' } }
      expect(deepEqual(a, b)).toBe(true)
    })

    it('detects a deep value difference', () => {
      const a = { address: { street: '1 Main', city: 'Rome', zip: '00100' } }
      const b = { address: { street: '1 Main', city: 'Pisa', zip: '00100' } }
      expect(deepEqual(a, b)).toBe(false)
    })

    it('is not equal when key counts differ', () => {
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
      expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
    })

    it('is not equal when keys differ but count matches', () => {
      expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
    })
  })

  describe('arrays', () => {
    it('compares arrays of objects element-wise', () => {
      const a = [{ label: 'home', number: '1' }, { label: 'work', number: '2' }]
      const b = [{ label: 'home', number: '1' }, { label: 'work', number: '2' }]
      expect(deepEqual(a, b)).toBe(true)
    })

    it('is order-sensitive', () => {
      const a = [{ label: 'home' }, { label: 'work' }]
      const b = [{ label: 'work' }, { label: 'home' }]
      expect(deepEqual(a, b)).toBe(false)
    })

    it('detects length differences', () => {
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
      expect(deepEqual([], [1])).toBe(false)
    })

    it('does not treat an array as equal to a like-keyed object', () => {
      // An array and an object with numeric keys must not be conflated.
      expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
    })
  })

  describe('whole-form shapes', () => {
    it('matches a full profile form deeply', () => {
      const form = {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        address: { street: '1 Main', city: 'Rome', zip: '00100' },
        phones: [{ label: 'home', number: '555-0100' }],
      }
      const clone = structuredClone(form)
      expect(deepEqual(form, clone)).toBe(true)
    })

    it('flags a single nested edit as different', () => {
      const form = {
        fullName: 'Ada',
        address: { street: '1 Main', city: 'Rome', zip: '00100' },
        phones: [{ label: 'home', number: '555-0100' }],
      }
      const edited = structuredClone(form)
      edited.phones[0].number = '555-0199'
      expect(deepEqual(form, edited)).toBe(false)
    })
  })
})
