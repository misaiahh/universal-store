import type { StoreApi, UseBoundStore } from 'zustand'

// Auto-generated selectors: a well-known zustand TS pattern. Instead of writing
// `useAppStore((s) => s.profileName)` everywhere, it lets you call
// `appStore.use.profileName()`. Purely a convenience wrapper over the store.
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(
  store: S,
): WithSelectors<S> {
  const withUse = store as WithSelectors<S>
  withUse.use = {} as WithSelectors<S>['use']
  for (const key of Object.keys(store.getState())) {
    const k = key as keyof ReturnType<S['getState']>
    // Each generated selector reads exactly one key.
    ;(withUse.use as Record<string, unknown>)[key] = () =>
      store((state) => (state as Record<string, unknown>)[k as string])
  }
  return withUse
}
