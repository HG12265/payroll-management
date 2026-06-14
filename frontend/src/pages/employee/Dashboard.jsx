import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Avatar, Chip,
  Divider, LinearProgress, CircularProgress
} from '@mui/material';
import {
  AccessTime, BeachAccess, Receipt, CheckCircle, Cancel, Schedule
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await dashboardAPI.employee();
        setStats(res.data);
      } catch { toast.error('Failed to load dashboard'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const today = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <Layout>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar sx={{
            width: 52, height: 52, fontWeight: 700, fontSize: 20,
            background: 'linear-gradient(135deg, #6366f1, #10b981)',
          }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Good {today.getHours() < 12 ? 'Morning' : today.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.first_name}!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Present Days',
            value: stats?.present_days ?? '—',
            sub: `${months[today.getMonth()]} ${today.getFullYear()}`,
            icon: <CheckCircle />, color: '#10b981',
            loading,
          },
          {
            title: 'Absent Days',
            value: stats?.absent_days ?? '—',
            sub: `${months[today.getMonth()]} ${today.getFullYear()}`,
            icon: <Cancel />, color: '#ef4444',
            loading,
          },
          {
            title: 'Leaves Taken',
            value: stats?.leave_taken_this_year ?? '—',
            sub: 'This year',
            icon: <BeachAccess />, color: '#f59e0b',
            loading,
          },
          {
            title: 'Latest Net Salary',
            value: stats?.latest_payslip?.net_salary
              ? `₹${parseFloat(stats.latest_payslip.net_salary).toLocaleString('en-IN')}`
              : '—',
            sub: stats?.latest_payslip
              ? `${months[(stats.latest_payslip.month || 1) - 1]} ${stats.latest_payslip.year}`
              : 'No payslip yet',
            icon: <Receipt />, color: '#8b5cf6',
            loading,
          },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.title}>
            <Card sx={{
              position: 'relative', overflow: 'hidden',
              '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: item.color },
              transition: 'transform 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)' },
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>{item.title}</Typography>
                    {item.loading ? <CircularProgress size={32} /> : (
                      <Typography variant="h3" sx={{ fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{item.sub}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${item.color}20`, color: item.color, width: 48, height: 48 }}>{item.icon}</Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Quick Actions</Typography>
              {[
                { icon: <AccessTime sx={{ color: '#10b981' }} />, text: 'Mark Attendance', hint: 'Go to Attendance → Scan QR', path: '/employee/attendance' },
                { icon: <BeachAccess sx={{ color: '#f59e0b' }} />, text: 'Apply for Leave', hint: 'Go to Leave → Apply Leave', path: '/employee/leave' },
                { icon: <Receipt sx={{ color: '#8b5cf6' }} />, text: 'Download Payslip', hint: 'Go to Payslips → Download PDF', path: '/employee/payslips' },
              ].map((action) => (
                <Box key={action.text} sx={{
                  display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                  borderRadius: 2, mb: 1.5, cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.2s ease',
                }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: 'transparent' }}>{action.icon}</Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{action.text}</Typography>
                    <Typography variant="caption" color="text.secondary">{action.hint}</Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Attendance Summary</Typography>
              {['Present', 'Absent'].map((label, i) => {
                const val = i === 0 ? (stats?.present_days || 0) : (stats?.absent_days || 0);
                const total = (stats?.present_days || 0) + (stats?.absent_days || 0) || 1;
                const pct = Math.round((val / total) * 100);
                const color = i === 0 ? '#10b981' : '#ef4444';
                return (
                  <Box key={label} sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>{label}</Typography>
                      <Typography variant="body2" sx={{ color, fontWeight: 700 }}>{val} days ({pct}%)</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={loading ? 0 : pct}
                      sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }}
                    />
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
