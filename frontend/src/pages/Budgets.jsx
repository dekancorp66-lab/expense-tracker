import { useState, useEffect, useCallback } from 'react'
import { budgetsAPI, categoriesAPI } from '../api/client'

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0)
}

export default function Budgets() {
  const [progress, setProgress] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category_id: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        budgetsAPI.progress({ month, year }),
        categoriesAPI.list({ type: 'expense' }),
      ])
      setProgress(pRes.data)
      setCategories(cRes.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await budgetsAPI.create({
        category_id: parseInt(form.category_id),
        amount: parseFloat(form.amount),
        month: form.month,
        year: form.year,
      })
      setSuccess('Budget created')
      setShowForm(false)
      setForm({ category_id: '', amount: '', month: month, year: year })
      load()
    } catch (err) {
      const d = err.response?.data?.detail
      setError(typeof d === 'string' ? d : 'Failed to create budget')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return
    try {
      await budgetsAPI.delete(id)
      setSuccess('Budget deleted')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Delete failed')
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Budgets</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Set Budget</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
            <h3 style={{ marginBottom: '1rem' }}>New Budget</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Month</label>
                  <select value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : progress.length === 0 ? (
        <div className="empty-state card">
          <h3>No budgets set</h3>
          <p>Set monthly category budgets to track spending limits.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: '1rem' }}>Set budget</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {progress.map((b) => (
            <div key={b.budget_id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>{b.category_name}</strong>
                <span className={`badge badge-${b.status}`}>{b.status} · {b.percentage}%</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill progress-${b.status}`} style={{ width: `${Math.min(b.percentage, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <span>Spent {formatMoney(b.spent)} of {formatMoney(b.budget_amount)}</span>
                <span>{formatMoney(b.remaining)} remaining</span>
              </div>
              {b.status === 'exceeded' && (
                <div className="alert alert-error" style={{ marginTop: '0.75rem', marginBottom: 0 }}>⚠️ Budget exceeded!</div>
              )}
              {b.status === 'approaching' && (
                <div className="alert" style={{ marginTop: '0.75rem', marginBottom: 0, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d' }}>
                  Approaching limit
                </div>
              )}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem', color: 'var(--danger)' }} onClick={() => handleDelete(b.budget_id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
