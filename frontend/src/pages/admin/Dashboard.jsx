import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Skeleton,
  Avatar, LinearProgress
} from '@mui/material';
import {
  People, CheckCircle, Cancel, BeachAccess, Receipt, TrendingUp
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import Layout from '../../components/Layout';
import { dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon, color, subtitle, loading }) => (
  <Card sx={{
    position: 'relative', overflow: 'hidden',
    '&::before': {
      content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3,
      background: `linear-gradient(90deg, ${color}, transparent)`,
    },
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 30px rgba(0,0,0,0.4)` },
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={80} height={48} />
          ) : (
            <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{
          bgcolor: `${color}20`, color, width: 52, height: 52,
          boxShadow: `0 4px 12px ${color}30`,
        }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await dashboardAPI.admin();
        setStats(res.data);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const attendanceData = stats ? [
    { name: 'Present', value: stats.present_today, color: '#10b981' },
    { name: 'Absent', value: stats.absent_today, color: '#ef4444' },
    { name: 'On Leave', value: stats.on_leave_today, color: '#f59e0b' },
  ] : [];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  return (
    <Layout>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{
          fontWeight: 800,
          background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Employees" value={stats?.total_employees ?? '-'} icon={<People />} color="#6366f1" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Present Today" value={stats?.present_today ?? '-'} icon={<CheckCircle />} color="#10b981" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Absent Today" value={stats?.absent_today ?? '-'} icon={<Cancel />} color="#ef4444" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="On Leave" value={stats?.on_leave_today ?? '-'} icon={<BeachAccess />} color="#f59e0b" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Pending Leaves" value={stats?.pending_leaves ?? '-'} icon={<TrendingUp />} color="#f97316" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Payroll Processed" value={stats?.payroll_processed_this_month ?? '-'} icon={<Receipt />} color="#8b5cf6" subtitle="This month" loading={loading} />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Attendance Pie Chart */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Today's Attendance
              </Typography>
              {loading ? (
                <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {attendanceData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Attendance Breakdown</Typography>
              {['Present', 'Absent', 'On Leave'].map((label, i) => {
                const val = [stats?.present_today, stats?.absent_today, stats?.on_leave_today][i] || 0;
                const total = stats?.total_employees || 1;
                const pct = Math.round((val / total) * 100);
                const color = COLORS[i];
                return (
                  <Box key={label} sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                      <Typography variant="body2" sx={{ color, fontWeight: 700 }}>{val} ({pct}%)</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 8, borderRadius: 4,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                      }}
                    />
                  </Box>
                );
              })}

              <Box sx={{ mt: 4, p: 2, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
                  Quick Actions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Navigate to Attendance → Generate QR Code for today's marking
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
