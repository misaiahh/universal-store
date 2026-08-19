import type { StateCreator } from 'zustand'
import type { AppStore } from '../appStore'
import { queryPagesByUser } from '../../api/dynamoClient'

// Top-level (NOT nested) hydration state + action. `hydrate` is the single entry
// point that loads EVERY page at once: it queries DynamoDB for all page items
// (one per sort key, keyed by the current session.sessionId) and fans each item
// into the owning nested slice via `applyForm` (a plain setter). For refetching
// a SINGLE page, call that page's own async `slice.hydrate()` instead.
export interface HydrationSlice {
  hydrating: boolean
  hydratedAt: string | null
  hydrationError: string | null
  hydrate: (sessionId?: string) => Promise<void>
}

export const createHydrationSlice: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  HydrationSlice
> = (set, get) => ({
  hydrating: false,
  hydratedAt: null,
  hydrationError: null,

  hydrate: async (sessionId = get().session.sessionId) => {
    if (get().hydrating) return
    set((s) => {
      s.hydrating = true
      s.hydrationError = null
    })
    try {
      const items = await queryPagesByUser(sessionId)

      // Route each item to the correct nested slice by its sort key. The switch
      // is exhaustive over PageKey; the default guards an unknown sort key.
      for (const item of items) {
        switch (item.sk) {
          case 'profile':
            get().profile.applyForm(item.form)
            break
          case 'company':
            get().company.applyForm(item.form)
            break
          case 'billing':
            get().billing.applyForm(item.form)
            break
          case 'preferences':
            get().preferences.applyForm(item.form)
            break
          default: {
            const _exhaustive: never = item
            void _exhaustive
          }
        }
      }

      set((s) => {
        s.hydratedAt = new Date().toISOString()
      })
    } catch (err) {
      set((s) => {
        s.hydrationError = err instanceof Error ? err.message : String(err)
      })
    } finally {
      set((s) => {
        s.hydrating = false
      })
    }
  },
})
