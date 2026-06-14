import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Grid,
  Chip, Button, Divider, CircularProgress
} from '@mui/material';
import { QrCode2, Download, Print, CheckCircle, AccessTime, Logout } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { authAPI, attendanceAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function EmployeeAttendance() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    Promise.all([
      authAPI.profile(),
      attendanceAPI.list({ month, year })
    ]).then(([profileRes, attRes]) => {
      setProfile(profileRes.data);
      const records = attRes.data.results || attRes.data;
      setAttendanceList(records);
      // Find today's record
      const todayStr = today.toISOString().split('T')[0];
      const todayRec = records.find(r => r.attendance_date === todayStr);
      setTodayAttendance(todayRec || null);
    }).catch(() => toast.error('Failed to load attendance data'))
      .finally(() => setLoading(false));
  }, []);

  const emp = profile?.employee_profile || {};
  const qrUrl = emp?.qr_code_url;

  const statusColor = {
    'Present': '#10b981',
    'Late': '#f59e0b',
    'Half Day': '#6366f1',
    'Absent': '#ef4444',
  };

  if (loading) return <Layout><Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box></Layout>;

  return (
    <Layout>
      <Typography variant="h4" fontWeight={800} mb={0.5}>My Attendance</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Show your QR card to the admin scanner to mark attendance
      </Typography>

      <Grid container spacing={3}>
        {/* QR Card Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{
            textAlign: 'center',
            background: 'linear-gradient(145deg, rgba(99,102,241,0.12), rgba(16,185,129,0.06))',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                <QrCode2 sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>My Attendance QR</Typography>
              </Box>

              {qrUrl ? (
                <>
                  {/* QR Code Image */}
                  <Box sx={{
                    p: 2, bgcolor: 'white', borderRadius: 3,
                    display: 'inline-block', mb: 2,
                    boxShadow: '0 8px 24px rgba(99,102,241,0.2)',
                  }}>
                    <img src={qrUrl} alt="My QR Code" style={{ width: 180, height: 180, display: 'block' }} />
                  </Box>

                  <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                    {emp.employee_code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    This is your permanent attendance QR card
                  </Typography>

                  <Chip
                    label="🔒 Encrypted & Tamper-Proof"
                    size="small"
                    sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600, mb: 2 }}
                  />

                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Button variant="outlined" fullWidth size="small" startIcon={<Download />}
                        href={qrUrl} download={`QR_${emp.employee_code}.png`} target="_blank">
                        Download
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button variant="contained" fullWidth size="small" startIcon={<Print />}
                        onClick={() => {
                          const w = window.open('', '_blank');
                          w.document.write(`
                            <html><head><title>ID Card - ${emp.employee_code}</title>
                            <style>
                              body { font-family: 'Segoe UI', sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; background:#f3f4f6; }
                              .card { width:2.5in; height:3.8in; background:white; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.15); padding:20px; text-align:center; border:1px solid #ddd; }
                              .logo { font-size:16px; font-weight:800; color:#4f46e5; margin-bottom:12px; }
                              .avatar { width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#10b981); color:white; line-height:72px; font-size:28px; font-weight:bold; margin:0 auto 10px; }
                              .name { font-size:15px; font-weight:700; margin:4px 0; color:#111; }
                              .desig { font-size:11px; color:#6b7280; margin:4px 0 14px; }
                              .qr img { width:130px; height:130px; }
                              .code { font-size:11px; color:#4f46e5; font-weight:700; margin-top:8px; }
                              @media print { body { background:white; } .card { box-shadow:none; } }
                            </style></head>
                            <body onload="window.print(); window.close();">
                              <div class="card">
                                <div class="logo">PayrollPro</div>
                                <div class="avatar">${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}</div>
                                <div class="name">${profile?.full_name}</div>
                                <div class="desig">${emp.designation || 'Employee'}</div>
                                <div class="qr"><img src="${qrUrl}" /></div>
                                <div class="code">${emp.employee_code}</div>
                              </div>
                            </body></html>
                          `);
                          w.document.close();
                        }}
                        sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                        Print ID
                      </Button>
                    </Grid>
                  </Grid>
                </>
              ) : (
                <Box sx={{ py: 4 }}>
                  <QrCode2 sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                  <Typography color="text.secondary">QR code not yet generated.</Typography>
                  <Typography variant="caption" color="text.secondary">Contact admin to generate your QR code.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Today's Status */}
          <Card sx={{ mt: 2, background: todayAttendance ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' : 'rgba(239,68,68,0.05)', border: `1px solid ${todayAttendance ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.1)'}` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Today's Status</Typography>
              {todayAttendance ? (
                <Box>
                  <Chip
                    label={todayAttendance.attendance_status || 'Present'}
                    size="small"
                    sx={{ bgcolor: `${statusColor[todayAttendance.attendance_status] || '#10b981'}20`, color: statusColor[todayAttendance.attendance_status] || '#10b981', fontWeight: 700, mb: 1.5 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Check-In</Typography>
                    <Typography variant="caption" fontWeight={700} color="#10b981">
                      {todayAttendance.check_in_time || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Check-Out</Typography>
                    <Typography variant="caption" fontWeight={700} color={todayAttendance.check_out_time ? '#6366f1' : 'text.secondary'}>
                      {todayAttendance.check_out_time || 'Not yet'}
                    </Typography>
                  </Box>
                  {todayAttendance.working_hours && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Working Hours</Typography>
                      <Typography variant="caption" fontWeight={700}>{parseFloat(todayAttendance.working_hours).toFixed(1)}h</Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <AccessTime sx={{ color: 'text.secondary', opacity: 0.4, mb: 0.5 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Not yet marked today
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Show your QR to admin scanner</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance History */}
        <Grid item xs={12} md={8}>
          <Card>
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="h6" fontWeight={700}>Attendance This Month</Typography>
              <Typography variant="caption" color="text.secondary">{new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</Typography>
            </Box>
            <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
              {attendanceList.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <QrCode2 sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                  <Typography color="text.secondary">No attendance records this month</Typography>
                </Box>
              ) : (
                attendanceList.map((rec) => (
                  <Box key={rec.id} sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{rec.attendance_date}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        In: {rec.check_in_time || '—'} &nbsp;|&nbsp; Out: {rec.check_out_time || '—'}
                        {rec.working_hours ? `  (${parseFloat(rec.working_hours).toFixed(1)}h)` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={rec.attendance_status || 'Present'}
                      sx={{
                        bgcolor: `${statusColor[rec.attendance_status] || '#10b981'}20`,
                        color: statusColor[rec.attendance_status] || '#10b981',
                        fontWeight: 600, fontSize: 11
                      }}
                    />
                  </Box>
                ))
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
