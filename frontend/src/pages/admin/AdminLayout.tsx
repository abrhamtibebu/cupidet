import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAdminAuth } from '../../lib/adminAuth'

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: '⌂' },
  { to: '/admin/matches', label: 'Matches', icon: '♥' },
  { to: '/admin/new-online', label: 'New & Online', icon: '◉' },
  { to: '/admin/demographics', label: 'Demographics', icon: '◎' },
  { to: '/admin/approvals', label: 'Approvals', icon: '✓' },
  { to: '/admin/languages', label: 'Languages', icon: 'あ' },
  { to: '/admin/contact', label: 'Contact', icon: '✎' },
]

export function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <img
            src="/mingle_251_icon.png"
            alt=""
            className="admin-brand-dot"
            width={36}
            height={36}
            style={{ objectFit: 'contain', padding: 0, background: 'transparent' }}
          />
          <span>
            <span className="admin-brand-name">Mingle 251</span>
            <span className="admin-brand-sub">Admin</span>
          </span>
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="admin-nav-icon" aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {open ? <button className="admin-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-icon-btn admin-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <div className="admin-search">
            <span aria-hidden>⌕</span>
            <input placeholder="Search users…" disabled />
          </div>
          <div className="admin-topbar-end">
            <button
              type="button"
              className="admin-avatar"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
            >
              {(admin?.name || 'A')
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </button>
            {menuOpen ? (
              <div className="admin-user-menu">
                <div className="admin-user-menu-meta">
                  <strong>{admin?.name}</strong>
                  <span>{admin?.email}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false)
                    await logout()
                    navigate('/admin/login', { replace: true })
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
