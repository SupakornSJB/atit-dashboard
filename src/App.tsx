import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { useAuthStore } from '@/store/authStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)()
  if (!isAuthenticated) return <Navigate to="/dashboard/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard/login" element={<LoginPage />} />
      <Route
        path="/dashboard/*"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard/" replace />} />
    </Routes>
  )
}