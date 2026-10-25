import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◫' },
  { to: '/transactions', label: 'Payments', icon: '◧' },
  { to: '/budgets', label: 'Transactions', icon: '◩' },
  { to: '/reports', label: 'Reports', icon: '◭' },
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
          <div className="brand-wrap">
            <div className="brand-mark">
              <span />
              <span />
              <span />
            </div>
            <span className="brand-name">COINEST</span>
          </div>
          <button className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="promo-card">
            <div className="promo-icon">◎</div>
            <div className="promo-text">
              <strong>Get Pro</strong>
              <span>Unlock finance insights and analytics</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>Get Pro</button>
        </div>
      </aside>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>

          <div className="toolbar-search">
            <span className="search-icon">⌕</span>
            <input type="text" value="Search placeholder" readOnly aria-label="Search" />
          </div>

          <div className="toolbar-actions">
            <button className="toolbar-btn" aria-label="Search">⌕</button>
            <button className="toolbar-btn" aria-label="Notifications">◌</button>
            <button className="toolbar-btn" aria-label="Profile">◉</button>
          </div>

          <div className="profile-pill">
            <div className="profile-avatar">{(user?.full_name || user?.username || 'A')[0].toUpperCase()}</div>
            <div className="profile-name">{user?.full_name || 'Andrew Forbist'}</div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
