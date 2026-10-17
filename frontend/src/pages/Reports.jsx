import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { reportsAPI } from '../api/client'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0)
}

export default function Reports() {
  const today = new Date()
  const [start, setStart] = useState(format(startOfMonth(today), 'yyyy-MM-dd'))
  const [end, setEnd] = useState(format(endOfMonth(today), 'yyyy-MM-dd'))
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await reportsAPI.summary({ start_date: start, end_date: end })
      setSummary(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [start, end])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    try {
      const { data } = await reportsAPI.exportCsv({ start_date: start, end_date: end })
      const url = window.URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions_${start}_${end}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Export failed')
    }
  }

  const pieData = (summary?.category_breakdown || []).map((c) => ({
    name: c.category_name,
    value: Number(c.total),
  }))

  const monthly = (summary?.monthly_summaries || []).map((m) => ({
    name: `${m.month}/${String(m.year).slice(2)}`,
    Income: Number(m.total_income),
    Expenses: Number(m.total_expense),
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Reports</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={{ padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
          <button className="btn btn-ghost" onClick={handleExport}>Export CSV</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Income</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--income)' }}>{formatMoney(summary.total_income)}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Expenses</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--expense)' }}>{formatMoney(summary.total_expense)}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Balance</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatMoney(summary.balance)}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Savings Rate</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{summary.savings_rate}%</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Transactions</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{summary.transaction_count}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Monthly Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" />
                  <XAxis dataKey="name" stroke="#8b9cb3" fontSize={12} />
                  <YAxis stroke="#8b9cb3" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1a2332', border: '1px solid #2d3a4f' }} />
                  <Bar dataKey="Income" fill="#22c55e" />
                  <Bar dataKey="Expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Category Breakdown</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a2332', border: '1px solid #2d3a4f' }} formatter={(v) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="empty-state"><p>No expense data</p></div>}
            </div>
          </div>

          {summary.category_breakdown?.length > 0 && (
            <div className="card table-wrap">
              <h3 style={{ marginBottom: '1rem' }}>Category Details</h3>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>%</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.category_breakdown.map((c, i) => (
                    <tr key={i}>
                      <td>{c.category_name}</td>
                      <td>{formatMoney(c.total)}</td>
                      <td>{c.percentage}%</td>
                      <td>{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
