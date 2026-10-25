import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { budgetsAPI, categoriesAPI } from '../api/client'
import './DataPages.css'

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
    <main className="budget-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">PLAN WITH PURPOSE</p>
          <h1>Budgets</h1>
          <p className="page-description">Set monthly limits and keep spending on track.</p>
        </div>
        <div className="period-controls">
          <select aria-label="Budget month" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <select aria-label="Budget year" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Set budget</button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>New budget</h3>
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
              <div className="form-row">
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
              <div className="modal-actions">
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
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Set budget</button>
        </div>
      ) : (
        <div className="budget-grid">
          {progress.map((b) => (
            <article key={b.budget_id} className="budget-card card">
              <div className="budget-card-top">
                <strong className="budget-card-title">{b.category_name}</strong>
                <span className={`budget-status ${b.status}`}>{b.status} · {Math.round(b.percentage)}%</span>
              </div>
              <div className="budget-progress-track" aria-label={`${b.percentage}% of budget used`}>
                <div className={`budget-progress-fill ${b.status}`} style={{ width: `${Math.min(Math.max(b.percentage, 0), 100)}%` }} />
              </div>
              <div className="budget-card-bottom">
                <span>Spent {formatMoney(b.spent)} of {formatMoney(b.budget_amount)}</span>
                <span>{formatMoney(b.remaining)} remaining</span>
              </div>
              {b.status === 'exceeded' && (
                <div className="alert alert-error budget-alert">Budget exceeded</div>
              )}
              {b.status === 'approaching' && (
                <div className="budget-alert approaching-alert">
                  Approaching limit
                </div>
              )}
              <div className="budget-card-actions">
                <button className="budget-delete" onClick={() => handleDelete(b.budget_id)}><Trash2 size={15} /> Delete budget</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
