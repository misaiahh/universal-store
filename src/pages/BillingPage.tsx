import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../stores/appStore'

// Billing page consumes only its own nested slice.
export function BillingPage() {
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
      form: s.billing.form,
      stage: s.billing.stage,
      persist: s.billing.persist,
      saving: s.billing.saving,
      savedAt: s.billing.savedAt,
      hydrate: s.billing.hydrate,
      hydrating: s.billing.hydrating,
      dirty: s.billing.dirty,
    })),
  )

  return (
    <section className="card">
      <h2>Billing</h2>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Name on card
          <input
            value={form.cardName}
            onChange={(e) => stage('cardName', e.target.value)}
          />
        </label>
        <label>
          Card number
          <input
            value={form.cardNumber}
            onChange={(e) => stage('cardNumber', e.target.value)}
          />
        </label>
        <label>
          Billing ZIP
          <input
            value={form.billingZip}
            onChange={(e) => stage('billingZip', e.target.value)}
          />
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
        Values live in the nested <code>billing</code> slice and persist to{' '}
        <code>sessionStorage</code>. <code>Save to DynamoDB</code> calls{' '}
        <code>billing.persist()</code> to hard-save this page.
      </p>
    </section>
  )
}
