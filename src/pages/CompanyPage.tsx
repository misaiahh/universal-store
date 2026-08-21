import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../stores/appStore'

// Company page consumes only its own nested slice.
export function CompanyPage() {
  const {
    companyName,
    industry,
    employees,
    stage,
    persist,
    saving,
    savedAt,
    hydrate,
    hydrating,
    dirty,
  } = useAppStore(
    useShallow((s) => ({
      companyName: s.company.companyName,
      industry: s.company.industry,
      employees: s.company.employees,
      stage: s.company.stage,
      persist: s.company.persist,
      saving: s.company.saving,
      savedAt: s.company.savedAt,
      hydrate: s.company.hydrate,
      hydrating: s.company.hydrating,
      dirty: s.company.dirty,
    })),
  )

  return (
    <section className="card">
      <h2>Company</h2>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Company name
          <input
            value={companyName}
            onChange={(e) => stage('companyName', e.target.value)}
          />
        </label>
        <label>
          Industry
          <input
            value={industry}
            onChange={(e) => stage('industry', e.target.value)}
          />
        </label>
        <label>
          Employees
          <input
            type="number"
            min={0}
            value={employees}
            onChange={(e) => stage('employees', Number(e.target.value))}
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
        Values live in the nested <code>company</code> slice and persist to{' '}
        <code>sessionStorage</code>. <code>Save to DynamoDB</code> calls{' '}
        <code>company.persist()</code> to hard-save this page.
      </p>
    </section>
  )
}
