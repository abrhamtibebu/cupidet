import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, lazy, useState, type ReactNode } from 'react'
import { AuthProvider } from './components/AuthProvider'
import { BrandLogo, BRAND_NAME } from './components/Brand'
import { TelegramBackButton } from './components/TelegramBackButton'
import { useAuth } from './lib/auth'
import { NavBadgeProvider } from './lib/navBadges'
import { AdminAuthProvider } from './lib/adminAuth'
import { WelcomeScreen } from './pages/Welcome'
import { AuthPage } from './pages/Auth'
import { OnboardingPage } from './pages/Onboarding'
import { UnderageScreen } from './pages/Underage'
import { AccountRestrictedScreen } from './pages/AccountRestricted'
import { AdminGuard } from './pages/admin/AdminGuard'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminLoginPage } from './pages/admin/Login'
import { AdminDashboardPage } from './pages/admin/Dashboard'
import { AdminMatchesPage } from './pages/admin/Matches'
import { AdminUsersPage } from './pages/admin/Users'
import { AdminDemographicsPage } from './pages/admin/Demographics'
import { AdminApprovalsPage } from './pages/admin/Approvals'
import { AdminLanguagesPage } from './pages/admin/Languages'
import { AdminReportsPage } from './pages/admin/Reports'

const INTRO_KEY = 'cupid_intro_v2'

const DiscoverPage = lazy(() => import('./pages/Discover').then((m) => ({ default: m.DiscoverPage })))
const LikesPage = lazy(() => import('./pages/Likes').then((m) => ({ default: m.LikesPage })))
const MessagesPage = lazy(() => import('./pages/Messages').then((m) => ({ default: m.MessagesPage })))
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })))
const ChatPage = lazy(() => import('./pages/Chat').then((m) => ({ default: m.ChatPage })))
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })))

function RouteFallback() {
  return (
    <div className="app-shell grid min-h-[50dvh] place-items-center">
      <div className="skeleton h-10 w-40 rounded-full" />
    </div>
  )
}

function Gate() {
  const { loading, user, onboardingComplete, logout, accountRestriction, clearAccountRestriction } = useAuth()
  const [, setGateTick] = useState(0)
  const underageBlocked = sessionStorage.getItem('cupid_underage') === '1'

  if (loading) {
    return (
      <div className="app-shell grid min-h-[100dvh] place-items-center">
        <div className="text-center">
          <BrandLogo size="splash" animated className="mx-auto mb-8" />
          <p className="brand-loading-text text-sm tracking-[0.12em] text-muted uppercase">
            Opening {BRAND_NAME}…
          </p>
          <div className="brand-loading-bar" aria-hidden />
        </div>
      </div>
    )
  }

  if (underageBlocked) {
    return (
      <UnderageScreen
        onOk={() => {
          sessionStorage.removeItem('cupid_underage')
          localStorage.removeItem(INTRO_KEY)
          setGateTick((n) => n + 1)
          window.location.reload()
        }}
      />
    )
  }

  const restriction =
    user?.status === 'banned' || user?.status === 'suspended'
      ? user.status
      : accountRestriction

  if (restriction) {
    return (
      <AccountRestrictedScreen
        status={restriction}
        onSignOut={() => {
          logout()
          clearAccountRestriction()
        }}
      />
    )
  }

  if (!user) return <AuthPage />

  if (!onboardingComplete) return <OnboardingPage />

  return (
    <NavBadgeProvider>
      <TelegramBackButton />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/likes" element={<LikesPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/chat/:matchId" element={<ChatPage />} />
          <Route path="/matches" element={<Navigate to="/likes" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </Suspense>
    </NavBadgeProvider>
  )
}

function DatingApp() {
  const [introDone, setIntroDone] = useState(
    () => localStorage.getItem(INTRO_KEY) === '1',
  )

  if (!introDone) {
    return (
      <WelcomeScreen
        onStart={() => {
          localStorage.setItem(INTRO_KEY, '1')
          setIntroDone(true)
        }}
      />
    )
  }

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="matches" element={<AdminMatchesPage />} />
            <Route path="new-online" element={<Navigate to="/admin/users" replace />} />
            <Route path="demographics" element={<AdminDemographicsPage />} />
            <Route path="approvals" element={<AdminApprovalsPage />} />
            <Route path="languages" element={<AdminLanguagesPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="contact" element={<Navigate to="/admin/reports" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  )
}

function RootSwitch({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (location.pathname.startsWith('/admin')) return <AdminApp />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <RootSwitch>
        <DatingApp />
      </RootSwitch>
    </BrowserRouter>
  )
}
