import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { transactionsAPI, categoriesAPI } from '../api/client'
import './DataPages.css'
import './Transactions.css'

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0)
}

const emptyForm = {
  description: '',
  amount: '',
  type: 'expense',
  date: new Date().toISOString().slice(0, 10),
  category_id: '',
  payment_method: '',
  notes: '',
}

export default function Transactions() {
  const [txns, setTxns] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState({ type: '', search: '', start_date: '', end_date: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.type) params.type = filters.type
      if (filters.search) params.search = filters.search
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      const [tRes, cRes] = await Promise.all([
        transactionsAPI.list({ ...params, limit: 100 }),
        categoriesAPI.list(),
      ])
      setTxns(tRes.data)
      setCategories(cRes.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const filteredCats = categories.filter((c) => c.type === form.type)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      date: t.date,
      category_id: t.category_id ? String(t.category_id) : '',
      payment_method: t.payment_method || '',
      notes: t.notes || '',
    })
    setShowForm(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
        date: form.date,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        payment_method: form.payment_method || null,
        notes: form.notes || null,
      }
      if (editing) {
        await transactionsAPI.update(editing.id, payload)
        setSuccess('Transaction updated')
      } else {
        await transactionsAPI.create(payload)
        setSuccess('Transaction added')
      }
      setShowForm(false)
      load()
    } catch (err) {
      const d = err.response?.data?.detail
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg).join(', ') : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await transactionsAPI.delete(id)
      setConfirmDelete(null)
      setSuccess('Transaction deleted')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Delete failed')
    }
  }

  return (
    <div className="transactions-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">ACCOUNT ACTIVITY</p>
          <h1>Transactions</h1>
          <p className="page-description">Review and manage your income and expenses.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={17} /> Add transaction</button>
      </header>

      <section className="data-metrics" aria-label="Transaction totals">
        <article className="data-metric card">
          <span>Visible records</span>
          <strong>{txns.length}</strong>
          <small>Matching your current filters</small>
        </article>
        <article className="data-metric card income-metric">
          <span>Visible income</span>
          <strong>{formatMoney(txns.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0))}</strong>
          <small>From loaded transactions</small>
        </article>
        <article className="data-metric card expense-metric">
          <span>Visible expenses</span>
          <strong>{formatMoney(txns.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0))}</strong>
          <small>From loaded transactions</small>
        </article>
      </section>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="filters data-toolbar card">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search description..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
          <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Transaction' : 'New Transaction'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category_id: '' })}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">— None —</option>
                  {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Payment method</label>
                <input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Cash, Card, Bank..." />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>Delete transaction?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : txns.length === 0 ? (
        <div className="empty-state card">
          <h3>No transactions</h3>
          <p>Add income or expenses to track your finances.</p>
          <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: '1rem' }}>Add transaction</button>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="hide-mobile">Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th className="hide-mobile">Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td className="hide-mobile">{t.category_name || '—'}</td>
                  <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                  <td className={t.type === 'income' ? 'income' : 'expense'}>
                    {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                  </td>
                  <td className="hide-mobile">{t.payment_method || '—'}</td>
                  <td>
                    <button className="icon-action" onClick={() => openEdit(t)} aria-label={`Edit ${t.description}`} title="Edit"><Pencil size={16} /></button>
                    <button className="icon-action danger-action" onClick={() => setConfirmDelete(t.id)} aria-label={`Delete ${t.description}`} title="Delete"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
