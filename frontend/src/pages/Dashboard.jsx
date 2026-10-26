import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus } from 'lucide-react'
import { budgetsAPI, reportsAPI, transactionsAPI } from '../api/client'
import './Dashboard.css'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatMoney(value) {
  return currency.format(Number(value) || 0)
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const today = new Date()
        const [summaryResponse, transactionsResponse, budgetsResponse] = await Promise.all([
          reportsAPI.summary(),
          transactionsAPI.list({ limit: 5 }),
          budgetsAPI.progress({ month: today.getMonth() + 1, year: today.getFullYear() }),
        ])
        if (active) {
          setSummary(summaryResponse.data)
          setTransactions(transactionsResponse.data)
          setBudgets(budgetsResponse.data)
        }
      } catch (err) {
        if (active) setError(err.response?.data?.detail || 'Could not load your dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => { active = false }
  }, [])

  const monthly = summary?.monthly_summaries || []
  const chartData = monthly.map((item) => ({
    month: new Date(item.year, item.month - 1).toLocaleDateString('en-US', { month: 'short' }),
    Income: Number(item.total_income),
    Expenses: Number(item.total_expense),
  }))
  const categories = summary?.category_breakdown || []

  return (
    <main className="dashboard-page">
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : summary && (
        <>
          <section className="dashboard-content">
            <article className="dashboard-panel card cashflow-panel">
              <div className="panel-header-row cashflow-header">
                <div>
                  <p className="dashboard-eyebrow">OVERVIEW</p>
                  <h1>Income Tracker</h1>
                  <small>Monthly income and expenses</small>
                </div>
                <div className="cashflow-panel-actions">
                  <span className="label-muted">Last 6 months</span>
                  <Link className="dashboard-add-link" to="/transactions"><Plus size={15} /> Add transaction</Link>
                </div>
              </div>
              {chartData.some((item) => item.Income || item.Expenses) ? (
                <div className="dashboard-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 12, right: 6, left: -22, bottom: 0 }}>
                      <CartesianGrid stroke="#eceef1" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8b8f97', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b8f97', fontSize: 10 }} />
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                        contentStyle={{ border: '1px solid #e9eaed', borderRadius: 7, boxShadow: '0 4px 14px rgba(25,32,45,.08)' }}
                      />
                      <Area type="monotone" dataKey="Income" stroke="#5368d5" fill="#5368d5" fillOpacity={0.08} strokeWidth={2} activeDot={{ r: 4 }} />
                      <Area type="monotone" dataKey="Expenses" stroke="#e4514b" fill="#e4514b" fillOpacity={0.06} strokeWidth={2} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="dashboard-chart-empty">
                  <span className="chart-empty-mark" aria-hidden="true" />
                  <p>Your cash flow will appear after you add transactions.</p>
                </div>
              )}
              <div className="chart-legend">
                <span><i className="income-dot" />Income</span>
                <span><i className="expense-dot" />Expenses</span>
              </div>
            </article>

            <article className="dashboard-panel card transactions-panel">
              <div className="panel-header-row">
                <span>Recent activity</span>
                <Link to="/transactions">View all</Link>
              </div>
              {transactions.length ? (
                <div className="recent-activity-list">
                  {transactions.slice(0, 4).map((transaction) => (
                    <div className="recent-activity-item" key={transaction.id}>
                      <span className={`activity-mark ${transaction.type}`} aria-hidden="true">
                        {transaction.type === 'income' ? '+' : '−'}
                      </span>
                      <div className="activity-description">
                        <strong>{transaction.description}</strong>
                        <small>{transaction.category_name || 'Uncategorized'} · {formatDate(transaction.date)}</small>
                      </div>
                      <strong className={transaction.type === 'income' ? 'dashboard-income' : 'dashboard-expense'}>
                        {transaction.type === 'income' ? '+' : '−'}{formatMoney(transaction.amount)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <p>No transactions yet.</p>
                  <Link to="/transactions">Add your first transaction</Link>
                </div>
              )}
            </article>

            <article className="dashboard-panel card budgets-panel">
              <div className="panel-header-row">
                <span>Monthly budgets</span>
                <Link to="/budgets">Manage</Link>
              </div>
              {budgets.length ? (
                <div className="category-list">
                  {budgets.map((budget) => (
                    <div className="category-row budget-row" key={budget.budget_id}>
                      <div className="category-row-label">
                        <span>{budget.category_name}</span>
                        <strong>{Math.round(Number(budget.percentage))}%</strong>
                      </div>
                      <div className="category-track">
                        <span
                          className={`budget-progress ${budget.status}`}
                          style={{ width: `${Math.min(100, Math.max(0, Number(budget.percentage)))}%` }}
                        />
                      </div>
                      <small>{formatMoney(budget.spent)} spent of {formatMoney(budget.budget_amount)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dashboard-empty">
                  No spending limits yet.<br />
                  <Link to="/budgets">Set a monthly budget</Link>
                </p>
              )}
            </article>

            <article className="dashboard-panel card snapshot-panel">
              <div className="panel-header-row"><span>Monthly overview</span></div>
              <div className="snapshot-balance">
                <small>Net balance</small>
                <strong>{formatMoney(summary.balance)}</strong>
              </div>
              <div className="snapshot-metrics">
                <div><span>Income</span><strong>{formatMoney(summary.total_income)}</strong></div>
                <div><span>Expenses</span><strong>{formatMoney(summary.total_expense)}</strong></div>
                <div><span>Transactions</span><strong>{summary.transaction_count}</strong></div>
              </div>
            </article>

            <article className="dashboard-panel card categories-panel">
              <div className="panel-header-row"><span>Spending insights</span></div>
              {categories.length ? (
                <div className="category-list">
                  {categories.slice(0, 4).map((category) => (
                    <div className="category-row" key={category.category_id ?? category.category_name}>
                      <div className="category-row-label">
                        <span>{category.category_name}</span>
                        <strong>{formatMoney(category.total)}</strong>
                      </div>
                      <div className="category-track">
                        <span style={{ width: `${Math.min(100, Number(category.percentage))}%` }} />
                      </div>
                      <small>{category.percentage}% of expenses</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dashboard-empty">Category insights appear after you record expenses.</p>
              )}
            </article>
          </section>
        </>
      )}
    </main>
  )
}
