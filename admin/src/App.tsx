import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard.tsx';
import Users from './pages/Users.tsx';
import Reports from './pages/Reports.tsx';
import DeskOfficer from './pages/DeskOfficer';
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
                <ProtectedRoute allowedRoles={['admin', 'supervisor', 'desk_officer']}>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="users" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Users />
                  </ProtectedRoute>
                } />
                <Route path="reports" element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="desk" element={
                  <ProtectedRoute allowedRoles={['desk_officer', 'admin', 'supervisor']}>
                    <DeskOfficer />
                  </ProtectedRoute>
                } />
                {/* Catch-all route - silent redirect to appropriate dashboard */}
                <Route path="*" element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor', 'desk_officer']}>
                    <div style={{ display: 'none' }} /> {/* This will trigger silent redirect */}
                  </ProtectedRoute>
                } />
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
