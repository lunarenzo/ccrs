import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard.tsx';
import Users from './pages/Users.tsx';
import Reports from './pages/Reports.tsx';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './contexts/ToastContext';
import ToastNotifications from './components/ui/Toast';
import { ProtectedRoute } from './components/auth/RoleGuard';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="users" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Users />
                  </ProtectedRoute>
                } />
                <Route path="reports" element={<Reports />} />
              </Route>
            </Routes>
          </Router>
          <ToastNotifications />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
