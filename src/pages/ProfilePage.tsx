import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../stores/appStore'

// Profile page consumes only its own nested slice. useShallow means this
// component re-renders only when the profile slice's picked values change.
export function ProfilePage() {
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
      form: s.profile.form,
      stage: s.profile.stage,
      persist: s.profile.persist,
      saving: s.profile.saving,
      savedAt: s.profile.savedAt,
      hydrate: s.profile.hydrate,
      hydrating: s.profile.hydrating,
      dirty: s.profile.dirty,
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
            onChange={(e) => stage('fullName', e.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => stage('email', e.target.value)}
          />
        </label>

        <fieldset className="group">
          <legend>Address (nested object)</legend>
          <label>
            Street
            <input
              value={form.address.street}
              onChange={(e) =>
                stage((d) => {
                  d.address.street = e.target.value
                })
              }
            />
          </label>
          <label>
            City
            <input
              value={form.address.city}
              onChange={(e) =>
                stage((d) => {
                  d.address.city = e.target.value
                })
              }
            />
          </label>
          <label>
            ZIP
            <input
              value={form.address.zip}
              onChange={(e) =>
                stage((d) => {
                  d.address.zip = e.target.value
                })
              }
            />
          </label>
        </fieldset>

        <fieldset className="group">
          <legend>Phones (array of objects)</legend>
          {form.phones.length === 0 && (
            <p className="hint">No phones yet.</p>
          )}
          {form.phones.map((phone, i) => (
            <div key={i} className="row">
              <label>
                Label
                <input
                  value={phone.label}
                  onChange={(e) =>
                    stage((d) => {
                      const phone = d.phones[i]
                      if (phone) phone.label = e.target.value
                    })
                  }
                />
              </label>
              <label>
                Number
                <input
                  value={phone.number}
                  onChange={(e) =>
                    stage((d) => {
                      const phone = d.phones[i]
                      if (phone) phone.number = e.target.value
                    })
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  stage((d) => {
                    d.phones.splice(i, 1)
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              stage((d) => {
                d.phones.push({ label: '', number: '' })
              })
            }
          >
            Add phone
          </button>
        </fieldset>
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
        This form demonstrates NESTED (<code>address</code>) and ARRAY (
        <code>phones</code>) data. Edits go through immer-backed setters, and{' '}
        <code>dirty</code> is computed with <code>deepEqual</code> against the
        hard snapshot — so editing a value back to its saved state clears dirty,
        even deep inside the array.
      </p>
    </section>
  )
}
