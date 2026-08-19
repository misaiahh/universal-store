// Tiny zero-dependency deep-equality check, used to compute a page's `dirty`
// flag by comparing its SOFT (working) form against its HARD (last-saved)
// snapshot. Scoped to the shapes our forms actually use: primitives, plain
// nested objects, and arrays. Not a general-purpose deep-equal (no Map/Set/Date
// handling) — the page forms never contain those.
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true

  // Beyond this point a difference in type or nullness means not equal.
  if (typeof a !== 'object' || a === null) return false
  if (typeof b !== 'object' || b === null) return false

  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray !== bIsArray) return false

  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)
  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false
    if (!deepEqual(aObj[key], bObj[key])) return false
  }
  return true
}
