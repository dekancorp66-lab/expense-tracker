import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChartNoAxesCombined, CreditCard, LayoutDashboard, LogOut, Menu, ReceiptText, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

const navItems = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', Icon: ReceiptText },
  { to: '/budgets', label: 'Budgets', Icon: CreditCard },
  { to: '/reports', label: 'Reports', Icon: ChartNoAxesCombined },
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
          <button className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
              title={item.label}
            >
              <span className="nav-icon"><item.Icon size={19} strokeWidth={1.8} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout} title="Log out">
            <LogOut size={18} strokeWidth={1.8} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="topbar-brand">COINEST <span>PERSONAL FINANCE</span></div>

          <div className="profile-pill">
            <div className="profile-avatar">{(user?.full_name || user?.username || 'A')[0].toUpperCase()}</div>
            <div className="profile-name">{user?.full_name || user?.username || 'Account'}</div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
