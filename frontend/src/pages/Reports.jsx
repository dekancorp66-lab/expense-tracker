import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Download } from 'lucide-react'
import { reportsAPI } from '../api/client'
import './DataPages.css'

const COLORS = ['#267454', '#c27b55', '#759a70', '#c5a15c', '#4f8290', '#bd766e', '#8e9970', '#657b69']

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
      <main className="report-page">
        <header className="page-heading">
          <div>
            <p className="page-eyebrow">YOUR NUMBERS, CLEARLY</p>
            <h1>Reports</h1>
            <p className="page-description">Track cash flow and spending patterns over time.</p>
          </div>
          <div className="report-toolbar">
            <input aria-label="Report start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <input aria-label="Report end date" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            <button className="btn btn-primary" onClick={handleExport}><Download size={16} /> Export CSV</button>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : summary && (
          <>
            <section className="report-summary" aria-label="Report summary">
              <article className="report-metric income"><span>Income</span><strong>{formatMoney(summary.total_income)}</strong></article>
              <article className="report-metric expenses"><span>Expenses</span><strong>{formatMoney(summary.total_expense)}</strong></article>
              <article className="report-metric"><span>Net balance</span><strong>{formatMoney(summary.balance)}</strong></article>
              <article className="report-metric"><span>Savings rate</span><strong>{summary.savings_rate}%</strong></article>
              <article className="report-metric"><span>Transactions</span><strong>{summary.transaction_count}</strong></article>
            </section>

            <section className="report-charts">
              <article className="report-panel">
                <h2>Monthly trend</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthly} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(63, 83, 69, 0.12)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(250, 248, 240, 0.97)', border: '1px solid rgba(60, 82, 67, 0.14)', borderRadius: 9, color: '#202a25' }}
                      formatter={(value) => formatMoney(value)}
                    />
                    <Bar dataKey="Income" fill="#267454" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#c27b55" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>
              <article className="report-panel">
                <h2>Expense categories</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={88} paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(247,245,237,0.9)" />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'rgba(250, 248, 240, 0.97)', border: '1px solid rgba(60, 82, 67, 0.14)', borderRadius: 9, color: '#202a25' }}
                        formatter={(value) => formatMoney(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state"><p>No expense data for this period.</p></div>}
              </article>
            </section>

            {summary.category_breakdown?.length > 0 && (
              <section className="report-table table-wrap">
                <h2>Category details</h2>
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
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
