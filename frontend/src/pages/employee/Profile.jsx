import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Grid,
  Divider, Chip, Button, TextField, CircularProgress, Alert
} from '@mui/material';
import { Person, Edit, Lock, QrCode2, Print, Download } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function EmployeeProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changePass, setChangePass] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  useEffect(() => {
    authAPI.profile().then(res => setProfile(res.data)).catch(() => toast.error('Failed to load profile')).finally(() => setLoading(false));
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    if (changePass.new_password !== changePass.confirm_password) {
      setPassError('New passwords do not match');
      return;
    }
    if (changePass.new_password.length < 8) {
      setPassError('Password must be at least 8 characters');
      return;
    }
    setPassLoading(true);
    try {
      await authAPI.changePassword({ old_password: changePass.old_password, new_password: changePass.new_password });
      toast.success('Password changed successfully!');
      setChangePass({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPassError(err.response?.data?.detail || err.response?.data?.old_password?.[0] || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) return <Layout><Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box></Layout>;

  const emp = profile?.employee_profile || {};

  return (
    <Layout>
      <Typography variant="h4" fontWeight={800} mb={3}>My Profile</Typography>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', p: 4 }}>
            <Avatar sx={{
              width: 90, height: 90, mx: 'auto', mb: 2, fontSize: 32, fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
            }}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
            <Typography variant="h6" fontWeight={700}>{profile?.full_name}</Typography>
            <Chip label={emp?.designation || 'Employee'} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: 'primary.main', my: 1 }} />
            <Typography variant="body2" color="text.secondary">{profile?.email}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="primary.main" fontWeight={700}>{emp?.employee_code || '—'}</Typography>
          </Card>

          {emp?.qr_code_url && (
            <Card sx={{ mt: 3, textAlign: 'center', p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                <QrCode2 sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>Attendance QR</Typography>
              </Box>
              
              <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, display: 'inline-block', mb: 2, border: '1px solid rgba(0,0,0,0.1)' }}>
                <img src={emp.qr_code_url} alt="Employee QR" style={{ width: 180, height: 180 }} />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Download />}
                    href={emp.qr_code_url}
                    download={`QR_${emp.employee_code}.png`}
                    target="_blank"
                  >
                    Download
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    startIcon={<Print />}
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>ID Card - ${emp.employee_code}</title>
                            <style>
                              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f3f4f6; }
                              .card { width: 2.125in; height: 3.375in; background: white; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); padding: 20px; text-align: center; border: 1px solid #ddd; }
                              .logo { font-size: 18px; font-weight: 800; color: #4f46e5; margin-bottom: 15px; }
                              .photo { width: 80px; height: 80px; border-radius: 50%; background: #4f46e5; color: white; line-height: 80px; font-size: 32px; font-weight: bold; margin: 0 auto 10px auto; }
                              .name { font-size: 16px; font-weight: bold; margin: 0; color: #1f2937; }
                              .desig { font-size: 12px; color: #6b7280; margin: 5px 0 15px 0; }
                              .qr { width: 120px; height: 120px; margin: 0 auto; }
                              .qr img { width: 100%; height: 100%; }
                              .footer { font-size: 10px; color: #9ca3af; margin-top: 15px; }
                              @media print { body { background: white; } .card { box-shadow: none; border: 1px solid #000; } }
                            </style>
                          </head>
                          <body onload="window.print(); window.close();">
                            <div class="card">
                              <div class="logo">Company Name</div>
                              <div class="photo">${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}</div>
                              <h2 class="name">${profile?.full_name}</h2>
                              <p class="desig">${emp.designation}</p>
                              <div class="qr"><img src="${emp.qr_code_url}" /></div>
                              <div class="footer">EMP ID: ${emp.employee_code}</div>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                  >
                    Print ID
                  </Button>
                </Grid>
              </Grid>
            </Card>
          )}
        </Grid>

        {/* Details */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Personal Information</Typography>
              <Grid container spacing={2}>
                {[
                  ['First Name', profile?.first_name],
                  ['Last Name', profile?.last_name],
                  ['Email', profile?.email],
                  ['Mobile', emp?.mobile || '—'],
                  ['Department', emp?.department?.department_name || '—'],
                  ['Joining Date', emp?.joining_date || '—'],
                  ['Basic Salary', emp?.basic_salary ? `₹${parseFloat(emp.basic_salary).toLocaleString('en-IN')}` : '—'],
                  ['Employment Status', emp?.employment_status || '—'],
                ].map(([label, value]) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>{label}</Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ mt: 0.25, textTransform: 'capitalize' }}>{value || '—'}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Lock sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="h6" fontWeight={700}>Change Password</Typography>
              </Box>
              {passError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{passError}</Alert>}
              <Box component="form" onSubmit={handlePasswordChange}>
                <TextField id="old-password" label="Current Password" type="password" fullWidth required
                  value={changePass.old_password} onChange={(e) => setChangePass({ ...changePass, old_password: e.target.value })}
                  inputProps={{ maxLength: 128 }} sx={{ mb: 2 }} />
                <TextField id="new-password" label="New Password" type="password" fullWidth required
                  value={changePass.new_password} onChange={(e) => setChangePass({ ...changePass, new_password: e.target.value })}
                  inputProps={{ maxLength: 128, minLength: 8 }} sx={{ mb: 2 }} helperText="At least 8 characters" />
                <TextField id="confirm-password" label="Confirm New Password" type="password" fullWidth required
                  value={changePass.confirm_password} onChange={(e) => setChangePass({ ...changePass, confirm_password: e.target.value })}
                  inputProps={{ maxLength: 128 }} sx={{ mb: 2 }} />
                <Button id="change-pass-btn" type="submit" variant="contained" disabled={passLoading}
                  sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                  {passLoading ? 'Saving...' : 'Change Password'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
