import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { budgetsAPI, reportsAPI, transactionsAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatMoney(value) {
  return currency.format(Number(value) || 0)
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

export default function Dashboard() {
  const { user } = useAuth()
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
  const maxMonthlyAmount = Math.max(
    1,
    ...monthly.flatMap((item) => [Number(item.total_income), Number(item.total_expense)]),
  )
  const categories = summary?.category_breakdown || []
  const greeting = new Date().getHours() < 12
    ? 'Good morning'
    : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">PERSONAL FINANCE OVERVIEW</p>
          <h1>{greeting}, {user?.full_name || user?.username || 'there'}</h1>
          <p>A clear view of your money this month.</p>
        </div>
        <Link className="dashboard-add-link" to="/transactions">Manage transactions</Link>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : summary && (
        <>
          <section className="dashboard-summary" aria-label="Monthly summary">
            <article className="summary-card income-summary card">
              <span>Income</span>
              <strong>{formatMoney(summary.total_income)}</strong>
              <i aria-hidden="true">↗</i>
            </article>
            <article className="summary-card expense-summary card">
              <span>Expenses</span>
              <strong>{formatMoney(summary.total_expense)}</strong>
              <i aria-hidden="true">↘</i>
            </article>
            <article className="summary-card savings-summary card">
              <span>Net balance</span>
              <strong>{formatMoney(summary.balance)}</strong>
              <i aria-hidden="true">◈</i>
            </article>
            <article className="summary-card count-summary card">
              <span>Transactions</span>
              <strong>{summary.transaction_count}</strong>
              <i aria-hidden="true">▤</i>
            </article>
          </section>

          <section className="dashboard-content">
            <div className="dashboard-main-column">
              <article className="dashboard-panel card">
                <div className="panel-header-row">
                  <span>Income and expenses</span>
                  <span className="label-muted">Last 6 months</span>
                </div>
                {monthly.some((item) => Number(item.total_income) || Number(item.total_expense)) ? (
                  <div className="monthly-chart">
                    {monthly.map((item) => (
                      <div className="monthly-column" key={`${item.year}-${item.month}`}>
                        <div className="monthly-bars">
                          <span
                            className="monthly-bar income-bar"
                            title={`Income: ${formatMoney(item.total_income)}`}
                            style={{ height: `${Math.max(2, Number(item.total_income) / maxMonthlyAmount * 100)}%` }}
                          />
                          <span
                            className="monthly-bar expense-bar"
                            title={`Expenses: ${formatMoney(item.total_expense)}`}
                            style={{ height: `${Math.max(2, Number(item.total_expense) / maxMonthlyAmount * 100)}%` }}
                          />
                        </div>
                        <span>{new Date(item.year, item.month - 1).toLocaleDateString('en-US', { month: 'short' })}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-empty">Your monthly trend will appear after you add transactions.</p>
                )}
                <div className="chart-legend">
                  <span><i className="income-dot" />Income</span>
                  <span><i className="expense-dot" />Expenses</span>
                </div>
              </article>

              <article className="dashboard-panel card">
                <div className="panel-header-row">
                  <span>Recent transactions</span>
                  <Link to="/transactions">View all</Link>
                </div>
                {transactions.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>{formatDate(transaction.date)}</td>
                            <td>{transaction.description}</td>
                            <td>{transaction.category_name || 'Uncategorized'}</td>
                            <td className={transaction.type === 'income' ? 'dashboard-income' : 'dashboard-expense'}>
                              {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="dashboard-empty">
                    <p>No transactions yet.</p>
                    <Link to="/transactions">Add your first transaction</Link>
                  </div>
                )}
              </article>
            </div>

            <aside className="dashboard-side-column">
              <article className="dashboard-panel card">
                <div className="panel-header-row">
                  <span>Monthly spending limits</span>
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

              <article className="dashboard-panel card">
                <div className="panel-header-row"><span>Expense categories</span></div>
                {categories.length ? (
                  <div className="category-list">
                    {categories.map((category) => (
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
                  <p className="dashboard-empty">Categories will appear here when you record an expense.</p>
                )}
              </article>
            </aside>
          </section>
        </>
      )}
    </main>
  )
}
