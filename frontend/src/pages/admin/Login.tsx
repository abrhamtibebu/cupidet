import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../lib/adminAuth'

export function AdminLoginPage() {
  const { admin, loading, login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@cupidet.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && admin) return <Navigate to="/admin" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <div className="admin-brand admin-brand-login">
          <span className="admin-brand-dot" aria-hidden>
            C
          </span>
          <span>
            <span className="admin-brand-name">Cupid ET</span>
            <span className="admin-brand-sub">Admin console</span>
          </span>
        </div>

        <div className="admin-login-lead">
          <h1>Sign in</h1>
          <p>Manage users, matches, and photo approvals.</p>
        </div>

        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            placeholder="you@cupidet.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <p className="admin-error">{error}</p> : null}

        <button type="submit" className="admin-btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="admin-login-hint">Use your Cupid admin credentials</p>
      </form>
    </div>
  )
}
