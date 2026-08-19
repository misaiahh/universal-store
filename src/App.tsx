import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from './stores/appStore'
import { PAGE_KEYS, type PageKey } from './stores/pages'
import { ProfilePage } from './pages/ProfilePage'
import { CompanyPage } from './pages/CompanyPage'
import { BillingPage } from './pages/BillingPage'
import { PreferencesPage } from './pages/PreferencesPage'
import './App.css'

const TAB_LABELS: Record<PageKey, string> = {
  profile: 'Profile',
  company: 'Company',
  billing: 'Billing',
  preferences: 'Preferences',
}

// Composition root: a page switcher plus the pages. Every page reads from the
// SAME single universal store; each touches only its own slice. The header
// drives a full-store hydration from DynamoDB (one item per sort key/page).
function App() {
  const [page, setPage] = useState<PageKey>('profile')

  const { hydrating, hydratedAt, hydrationError, hydrate } = useAppStore(
    useShallow((s) => ({
      hydrating: s.hydrating,
      hydratedAt: s.hydratedAt,
      hydrationError: s.hydrationError,
      hydrate: s.hydrate,
    })),
  )

  // Session controls. The sessionId is the DynamoDB partition key for every
  // page; changing or resetting it wipes all "soft" (sessionStorage) form data.
  const { sessionId, setSessionId, resetSession } = useAppStore(
    useShallow((s) => ({
      sessionId: s.session.sessionId,
      setSessionId: s.session.setSessionId,
      resetSession: s.session.resetSession,
    })),
  )
  const [sessionDraft, setSessionDraft] = useState('')

  return (
    <div className="layout">
      <header className="topbar">
        <h1>Universal store — one store, one slice per page</h1>
        <nav className="tabs">
          {PAGE_KEYS.map((id) => (
            <button
              key={id}
              type="button"
              className={page === id ? 'tab active' : 'tab'}
              onClick={() => setPage(id)}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </nav>
        <div className="session">
          <span className="session-id">
            Session: <code>{sessionId || '(none)'}</code>
          </span>
          <button type="button" onClick={() => resetSession()}>
            New session (wipes soft data)
          </button>
          <form
            className="session-set"
            onSubmit={(e) => {
              e.preventDefault()
              const id = sessionDraft.trim()
              if (!id) return
              setSessionId(id)
              setSessionDraft('')
            }}
          >
            <input
              type="text"
              placeholder="Set session ID…"
              value={sessionDraft}
              onChange={(e) => setSessionDraft(e.target.value)}
            />
            <button type="submit">Switch</button>
          </form>
        </div>
      </header>

      <main className="content">
        <div className="toolbar">
          <button
            type="button"
            onClick={() => void hydrate()}
            disabled={hydrating}
          >
            {hydrating ? 'Hydrating…' : 'Hydrate all pages from DynamoDB'}
          </button>
          <span className="status">
            {hydrationError
              ? `Error: ${hydrationError}`
              : hydratedAt
                ? `Hydrated at ${new Date(hydratedAt).toLocaleTimeString()}`
                : 'Not hydrated yet'}
          </span>
        </div>

        <p className="hint">
          One <code>create()</code> store with one nested slice per page. Each
          page's form values persist to <code>sessionStorage</code> and rehydrate
          via a deep-merge that keeps slice actions intact. The top-level{' '}
          <code>hydrate()</code> loads every page from DynamoDB (one item per sort
          key); each page's <code>persist()</code> hard-saves it back.
        </p>

        {page === 'profile' && <ProfilePage />}
        {page === 'company' && <CompanyPage />}
        {page === 'billing' && <BillingPage />}
        {page === 'preferences' && <PreferencesPage />}
      </main>
    </div>
  )
}

export default App
