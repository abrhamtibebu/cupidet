import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAdminAuth } from '../../lib/adminAuth'

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: IconHome },
  { to: '/admin/users', label: 'Users', icon: IconUsers },
  { to: '/admin/matches', label: 'Matches', icon: IconHeart },
  { to: '/admin/demographics', label: 'Demographics', icon: IconMap },
  { to: '/admin/approvals', label: 'Approvals', icon: IconCheck },
  { to: '/admin/languages', label: 'Languages', icon: IconLang },
  { to: '/admin/reports', label: 'Reports', icon: IconFlag },
]

export function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointer(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/admin/users?q=${encodeURIComponent(q)}` : '/admin/users')
    setOpen(false)
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <img src="/mingle_251_icon.png" alt="" className="admin-brand-dot" width={36} height={36} />
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
                <item.icon />
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
            <IconMenu />
          </button>
          <form className="admin-search" onSubmit={onSearch}>
            <IconSearch />
            <input
              placeholder="Search users…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search users"
            />
          </form>
          <div className="admin-topbar-end" ref={menuRef}>
            <button
              type="button"
              className="admin-avatar"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
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

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 19c.8-3 3-5 6.5-5s5.7 2 6.5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14c2.4.3 4.2 1.7 5 4" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-9.5-8.2C.7 8.8 2.2 5 5.6 5c2 0 3.3 1.2 4.1 2.3C10.5 6.2 11.8 5 13.8 5c3.4 0 4.9 3.8 3.1 6.8C19 15.6 12 20 12 20z" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6.5v13.5L9 17.5 15 20l6-2.5V4L15 6.5 9 4z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  )
}

function IconLang() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}

function IconFlag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4" />
      <path d="M5 4h11l-1.5 3.5L16 11H5" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
