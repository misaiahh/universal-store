import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../stores/appStore'

// Preferences page consumes only its own nested slice.
export function PreferencesPage() {
  const {
    form,
    stage,
    persist,
    saving,
    savedAt,
    hydrate,
    hydrating,
    dirty,
  } = useAppStore(
    useShallow((s) => ({
      form: s.preferences.form,
      stage: s.preferences.stage,
      persist: s.preferences.persist,
      saving: s.preferences.saving,
      savedAt: s.preferences.savedAt,
      hydrate: s.preferences.hydrate,
      hydrating: s.preferences.hydrating,
      dirty: s.preferences.dirty,
    })),
  )

  return (
    <section className="card">
      <h2>Preferences</h2>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Theme
          <select
            value={form.theme}
            onChange={(e) =>
              stage('theme', e.target.value as 'light' | 'dark')
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Language
          <select
            value={form.language}
            onChange={(e) => stage('language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.newsletter}
            onChange={(e) => stage('newsletter', e.target.checked)}
          />
          Subscribe to newsletter
        </label>
      </form>
      <div className="toolbar">
        <button
          type="button"
          onClick={() => void persist()}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving…' : 'Save to DynamoDB'}
        </button>
        <button
          type="button"
          onClick={() => void hydrate()}
          disabled={hydrating}
        >
          {hydrating ? 'Refetching…' : 'Refetch this page'}
        </button>
        {dirty && <span className="badge badge-dirty">● Unsaved changes</span>}
        <span className="status">
          {savedAt
            ? `Saved at ${new Date(savedAt).toLocaleTimeString()}`
            : 'Not saved yet'}
        </span>
      </div>
      <p className="hint">
        Values live in the nested <code>preferences</code> slice and persist to{' '}
        <code>sessionStorage</code>. <code>Save to DynamoDB</code> calls{' '}
        <code>preferences.persist()</code> to hard-save this page.
      </p>
    </section>
  )
}
