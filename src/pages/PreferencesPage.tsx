import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../stores/appStore'

// Preferences page consumes only its own nested slice.
export function PreferencesPage() {
  const { form, setField, persist, saving, savedAt, hydrate, hydrating } =
    useAppStore(
      useShallow((s) => ({
        form: s.preferences.form,
        setField: s.preferences.setField,
        persist: s.preferences.persist,
        saving: s.preferences.saving,
        savedAt: s.preferences.savedAt,
        hydrate: s.preferences.hydrate,
        hydrating: s.preferences.hydrating,
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
              setField('theme', e.target.value as 'light' | 'dark')
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
            onChange={(e) => setField('language', e.target.value)}
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
            onChange={(e) => setField('newsletter', e.target.checked)}
          />
          Subscribe to newsletter
        </label>
      </form>
      <div className="toolbar">
        <button type="button" onClick={() => void persist()} disabled={saving}>
          {saving ? 'Saving…' : 'Save to DynamoDB'}
        </button>
        <button
          type="button"
          onClick={() => void hydrate()}
          disabled={hydrating}
        >
          {hydrating ? 'Refetching…' : 'Refetch this page'}
        </button>
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
