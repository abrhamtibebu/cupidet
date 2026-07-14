import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../lib/adminAuth'

export function AdminGuard() {
  const { admin, loading } = useAdminAuth()

  if (loading) {
    return (
      <div className="admin-login">
        <p className="admin-muted">Loading admin…</p>
      </div>
    )
  }

  if (!admin) return <Navigate to="/admin/login" replace />

  return <Outlet />
}
