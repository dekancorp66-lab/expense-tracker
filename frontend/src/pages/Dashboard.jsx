import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { reportsAPI, transactionsAPI, budgetsAPI } from '../api/client'
import './Dashboard.css'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0)
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('this_month')
  const [error, setError] = useState('')

  const getDates = useCallback(() => {
    const today = new Date()
    if (period === 'this_month') {
      return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') }
    }
    if (period === 'last_month') {
      const last = subMonths(today, 1)
      return { start: format(startOfMonth(last), 'yyyy-MM-dd'), end: format(endOfMonth(last), 'yyyy-MM-dd') }
    }
    if (period === 'last_3') {
      return { start: format(startOfMonth(subMonths(today, 2)), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') }
    }
    return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') }
  }, [period])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { start, end } = getDates()
        const today = new Date()
        const [sumRes, txnRes, progRes] = await Promise.all([
          reportsAPI.summary({ start_date: start, end_date: end }),
          transactionsAPI.list({ limit: 8 }),
          budgetsAPI.progress({ month: today.getMonth() + 1, year: today.getFullYear() }),
        ])
        if (!cancelled) {
          setSummary(sumRes.data)
          setRecent(txnRes.data)
          setProgress(progRes.data)
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getDates])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>

  const chartData = (summary?.monthly_summaries || []).map((m) => ({
    name: `${m.month}/${m.year}`,
    Income: Number(m.total_income),
    Expenses: Number(m.total_expense),
  }))

  const pieData = (summary?.category_breakdown || []).slice(0, 8).map((c) => ({
    name: c.category_name,
    value: Number(c.total),
  }))

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h2>Dashboard</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="period-select">
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="last_3">Last 3 months</option>
        </select>
      </div>

      <div className="summary-cards">
        <div className="summary-card card">
          <div className="summary-label">Total Income</div>
          <div className="summary-value income">{formatMoney(summary?.total_income)}</div>
        </div>
        <div className="summary-card card">
          <div className="summary-label">Total Expenses</div>
          <div className="summary-value expense">{formatMoney(summary?.total_expense)}</div>
        </div>
        <div className="summary-card card">
          <div className="summary-label">Balance</div>
          <div className={`summary-value ${Number(summary?.balance) >= 0 ? 'income' : 'expense'}`}>
            {formatMoney(summary?.balance)}
          </div>
        </div>
        <div className="summary-card card">
          <div className="summary-label">Savings Rate</div>
          <div className="summary-value">{summary?.savings_rate ?? 0}%</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <h3>Income vs Expenses</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" />
                <XAxis dataKey="name" stroke="#8b9cb3" fontSize={12} />
                <YAxis stroke="#8b9cb3" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1a2332', border: '1px solid #2d3a4f' }} />
                <Legend />
                <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No data for chart</p></div>
          )}
        </div>
        <div className="card chart-card">
          <h3>Spending by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a2332', border: '1px solid #2d3a4f' }} formatter={(v) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No expense data</p></div>
          )}
        </div>
      </div>

      {progress.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Budget Progress (This Month)</h3>
          <div className="budget-list">
            {progress.map((b) => (
              <div key={b.budget_id} className="budget-item">
                <div className="budget-item-header">
                  <span>{b.category_name}</span>
                  <span className={`badge badge-${b.status}`}>{b.percentage}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill progress-${b.status}`} style={{ width: `${Math.min(b.percentage, 100)}%` }} />
                </div>
                <div className="budget-item-footer">
                  <span>{formatMoney(b.spent)} / {formatMoney(b.budget_amount)}</span>
                  <span>{formatMoney(b.remaining)} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Recent Transactions</h3>
          <Link to="/transactions" className="btn btn-ghost btn-sm">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions yet</h3>
            <p>Add your first income or expense to get started.</p>
            <Link to="/transactions" className="btn btn-primary" style={{ marginTop: '1rem' }}>Add transaction</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.description}</td>
                    <td>{t.category_name || '—'}</td>
                    <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                    <td className={t.type === 'income' ? 'income' : 'expense'}>
                      {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
