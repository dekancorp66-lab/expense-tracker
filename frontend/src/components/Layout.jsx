import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Transactions', icon: '💳' },
  { to: '/budgets', label: 'Budgets', icon: '🎯' },
  { to: '/reports', label: 'Reports', icon: '📈' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo">💰 ExpenseTracker</span>
          <button className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{(user?.full_name || user?.username || 'U')[0].toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.full_name || user?.username}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ width: '100%', marginTop: '0.75rem' }}>
            Logout
          </button>
        </div>
      </aside>
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>
          <h1 className="page-title">Expense Tracker</h1>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
