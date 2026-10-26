import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChartNoAxesCombined, CreditCard, LayoutDashboard, LogOut, ReceiptText } from 'lucide-react'
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <main className="main-content">
        <header className="topbar">
          <NavLink to="/" className="topbar-brand" aria-label="Tally home">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>TALLY</span>
          </NavLink>

          <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}
            >
              <item.Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          </nav>

          <div className="topbar-actions">
            <div className="profile-pill">
            <div className="profile-avatar">{(user?.full_name || user?.username || 'A')[0].toUpperCase()}</div>
            <div className="profile-name">{user?.full_name || user?.username || 'Account'}</div>
            </div>
            <button className="logout-button" onClick={handleLogout} title="Log out" aria-label="Log out">
              <LogOut size={17} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
