import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminDepartments from './pages/admin/Departments';
import AdminEmployees from './pages/admin/Employees';
import AdminAttendance from './pages/admin/Attendance';
import AdminScanner from './pages/admin/Scanner';
import AdminLeave from './pages/admin/Leave';
import AdminSalaryRules from './pages/admin/SalaryRules';
import AdminPayroll from './pages/admin/Payroll';
import AdminPayslips from './pages/admin/Payslips';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminPendingRegistrations from './pages/admin/PendingRegistrations';

import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeProfile from './pages/employee/Profile';
import EmployeeAttendance from './pages/employee/Attendance';
import EmployeeLeave from './pages/employee/Leave';
import EmployeePayroll from './pages/employee/Payroll';
import EmployeePayslips from './pages/employee/Payslips';

// Premium dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
    secondary: { main: '#10b981', light: '#34d399', dark: '#059669' },
    background: { default: '#0f172a', paper: '#1e293b' },
    surface: { main: '#1e293b' },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    success: { main: '#10b981' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' },
        }}
      />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute adminOnly><AdminDepartments /></ProtectedRoute>} />
            <Route path="/admin/employees" element={<ProtectedRoute adminOnly><AdminEmployees /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute adminOnly><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/scanner" element={<ProtectedRoute adminOnly><AdminScanner /></ProtectedRoute>} />
            <Route path="/admin/leave" element={<ProtectedRoute adminOnly><AdminLeave /></ProtectedRoute>} />
            <Route path="/admin/salary-rules" element={<ProtectedRoute adminOnly><AdminSalaryRules /></ProtectedRoute>} />
            <Route path="/admin/payroll" element={<ProtectedRoute adminOnly><AdminPayroll /></ProtectedRoute>} />
            <Route path="/admin/payslips" element={<ProtectedRoute adminOnly><AdminPayslips /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute adminOnly><AdminAuditLogs /></ProtectedRoute>} />
            <Route path="/admin/pending-registrations" element={<ProtectedRoute adminOnly><AdminPendingRegistrations /></ProtectedRoute>} />

            {/* Employee Routes */}
            <Route path="/employee/dashboard" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/profile" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/employee/attendance" element={<ProtectedRoute><EmployeeAttendance /></ProtectedRoute>} />
            <Route path="/employee/leave" element={<ProtectedRoute><EmployeeLeave /></ProtectedRoute>} />
            <Route path="/employee/payroll" element={<ProtectedRoute><EmployeePayroll /></ProtectedRoute>} />
            <Route path="/employee/payslips" element={<ProtectedRoute><EmployeePayslips /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
