import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../stores/appStore'

// Profile page consumes only its own nested slice. useShallow means this
// component re-renders only when the profile slice's picked values change.
export function ProfilePage() {
  const { form, setField, persist, saving, savedAt, hydrate, hydrating } =
    useAppStore(
      useShallow((s) => ({
        form: s.profile.form,
        setField: s.profile.setField,
        persist: s.profile.persist,
        saving: s.profile.saving,
        savedAt: s.profile.savedAt,
        hydrate: s.profile.hydrate,
        hydrating: s.profile.hydrating,
      })),
    )

  return (
    <section className="card">
      <h2>Profile</h2>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Full name
          <input
            value={form.fullName}
            onChange={(e) => setField('fullName', e.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
          />
        </label>
        <label>
          Phone
          <input
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
          />
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
        Values live in the nested <code>profile</code> slice and persist to{' '}
        <code>sessionStorage</code>. <code>Save to DynamoDB</code> calls{' '}
        <code>profile.persist()</code> to hard-save this page.
      </p>
    </section>
  )
}
