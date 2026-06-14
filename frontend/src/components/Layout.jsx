import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Avatar, Divider, IconButton, Tooltip, AppBar, Toolbar, Badge
} from '@mui/material';
import {
  Dashboard, People, Business, AccessTime, BeachAccess,
  AccountBalance, Receipt, BarChart, Settings, Logout,
  Menu, ChevronLeft, Security, Notifications, AttachMoney, HowToReg
} from '@mui/icons-material';
import { employeeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 260;

const buildAdminNavItems = (pendingCount) => [
  { label: 'Dashboard', icon: <Dashboard />, path: '/admin/dashboard' },
  { label: 'Departments', icon: <Business />, path: '/admin/departments' },
  { label: 'Employees', icon: <People />, path: '/admin/employees' },
  {
    label: 'Pending Approvals',
    icon: <Badge badgeContent={pendingCount} color="error" max={99}><HowToReg /></Badge>,
    path: '/admin/pending-registrations'
  },
  { label: 'Attendance', icon: <AccessTime />, path: '/admin/attendance' },
  { label: 'QR Scanner', icon: <Security />, path: '/admin/scanner' },
  { label: 'Leave', icon: <BeachAccess />, path: '/admin/leave' },
  { label: 'Salary Rules', icon: <AccountBalance />, path: '/admin/salary-rules' },
  { label: 'Payroll', icon: <AttachMoney />, path: '/admin/payroll' },
  { label: 'Payslips', icon: <Receipt />, path: '/admin/payslips' },
  { label: 'Reports', icon: <BarChart />, path: '/admin/reports' },
  { label: 'Audit Logs', icon: <Security />, path: '/admin/audit-logs' },
  { label: 'Settings', icon: <Settings />, path: '/admin/settings' },
];

const employeeNavItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/employee/dashboard' },
  { label: 'Attendance', icon: <AccessTime />, path: '/employee/attendance' },
  { label: 'Leave', icon: <BeachAccess />, path: '/employee/leave' },
  { label: 'Payroll', icon: <AttachMoney />, path: '/employee/payroll' },
  { label: 'Payslips', icon: <Receipt />, path: '/employee/payslips' },
  { label: 'Profile', icon: <People />, path: '/employee/profile' },
];

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      employeeAPI.pending().then(res => setPendingCount(res.data.length)).catch(() => {});
    }
  }, [isAdmin, location.pathname]);

  const navItems = isAdmin ? buildAdminNavItems(pendingCount) : employeeNavItems;
  const drawerWidth = collapsed ? 72 : DRAWER_WIDTH;

  const drawerContent = (
    <Box sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    }}>
      {/* Logo */}
      <Box sx={{
        p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        minHeight: 64,
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 800, fontSize: 14 }}>P</Typography>
        </Box>
        {!collapsed && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
              PayrollPro
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              {isAdmin ? 'Administrator' : 'Employee Portal'}
            </Typography>
          </Box>
        )}
        <IconButton
          onClick={() => setCollapsed(!collapsed)}
          sx={{ ml: 'auto', color: 'text.secondary', display: { xs: 'none', sm: 'flex' } }}
          size="small"
        >
          {collapsed ? <Menu fontSize="small" /> : <ChevronLeft fontSize="small" />}
        </IconButton>
      </Box>

      {/* Nav Items */}
      <List sx={{ flex: 1, px: 1, py: 1.5, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    minHeight: 44,
                    px: collapsed ? 1.5 : 2,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: active
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.15))'
                      : 'transparent',
                    border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                    '&:hover': {
                      background: 'rgba(99,102,241,0.1)',
                      transform: 'translateX(2px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon sx={{
                    minWidth: collapsed ? 0 : 36,
                    color: active ? 'primary.main' : 'text.secondary',
                    mr: collapsed ? 0 : 0,
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 14, fontWeight: active ? 600 : 400,
                        color: active ? 'primary.light' : 'text.secondary',
                      }}
                    />
                  )}
                  {active && !collapsed && (
                    <Box sx={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: 'primary.main', bgcolor: 'primary.main',
                    }} />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* User footer */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{
            width: 36, height: 36, flexShrink: 0, fontSize: 14, fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1, #10b981)',
          }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </Avatar>
          {!collapsed && (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }} noWrap>
                {user?.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
          )}
        </Box>
        <Tooltip title="Logout" placement="right">
          <ListItemButton
            id="nav-logout"
            onClick={logout}
            sx={{
              borderRadius: 2, px: collapsed ? 1.5 : 2,
              justifyContent: collapsed ? 'center' : 'flex-start',
              '&:hover': { background: 'rgba(239,68,68,0.1)', color: 'error.main' },
              color: 'text.secondary', transition: 'all 0.2s ease',
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit' }}>
              <Logout fontSize="small" />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 14 }} />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          display: { sm: 'none' },
          background: 'rgba(30,41,59,0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, ml: 1 }}>PayrollPro</Typography>
        </Toolbar>
      </AppBar>

      {/* Desktop Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            transition: 'width 0.25s ease',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
        ModalProps={{ keepMounted: true }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{
        flexGrow: 1,
        p: { xs: 2, sm: 3 },
        mt: { xs: 7, sm: 0 },
        background: 'var(--color-bg)',
        minHeight: '100vh',
        transition: 'all 0.25s ease',
      }}>
        <Box className="fade-in">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
