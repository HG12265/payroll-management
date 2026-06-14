import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Divider, Switch, FormControlLabel, CircularProgress, Alert
} from '@mui/material';
import { Save, Business, SupervisorAccount } from '@mui/icons-material';
import Layout from '../../components/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [form, setForm] = useState({
    company_name: '', company_address: '', company_email: '', company_phone: '',
    pf_enabled: true, esi_enabled: true, pt_enabled: true,
    work_start_time: '09:00', grace_minutes: 15,
    casual_leave_quota: 12, sick_leave_quota: 12, earned_leave_quota: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings/').then(res => setForm(s => ({ ...s, ...res.data }))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/', form);
      toast.success('Settings saved successfully!');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const [adminForm, setAdminForm] = useState({
    email: '', first_name: '', last_name: '', password: ''
  });
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.email || !adminForm.first_name || !adminForm.last_name || !adminForm.password) {
      toast.error('All fields are required');
      return;
    }
    if (adminForm.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    setAdminSubmitting(true);
    try {
      await api.post('/auth/add-admin/', adminForm);
      toast.success('Admin user created successfully!');
      setAdminForm({ email: '', first_name: '', last_name: '', password: '' });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to create admin';
      toast.error(detail);
    } finally {
      setAdminSubmitting(false);
    }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  if (loading) return <Layout><Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box></Layout>;

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Settings</Typography>
          <Typography variant="body2" color="text.secondary">Company-wide configuration</Typography>
        </Box>
        <Button id="save-settings-btn" variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Company Info & Admin Management */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Business sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>Company Information</Typography>
              </Box>
              <TextField id="settings-company-name" label="Company Name" fullWidth value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)} inputProps={{ maxLength: 200 }} sx={{ mb: 2 }} />
              <TextField id="settings-address" label="Company Address" fullWidth multiline rows={2}
                value={form.company_address} onChange={(e) => set('company_address', e.target.value)}
                inputProps={{ maxLength: 500 }} sx={{ mb: 2 }} />
              <TextField id="settings-email" label="Company Email" type="email" fullWidth
                value={form.company_email} onChange={(e) => set('company_email', e.target.value)}
                inputProps={{ maxLength: 254 }} sx={{ mb: 2 }} />
              <TextField id="settings-phone" label="Company Phone" fullWidth
                value={form.company_phone} onChange={(e) => set('company_phone', e.target.value)}
                inputProps={{ maxLength: 20 }} />
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <SupervisorAccount sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>Add New Administrator</Typography>
              </Box>
              <form onSubmit={handleCreateAdmin}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="First Name"
                      fullWidth
                      size="small"
                      value={adminForm.first_name}
                      onChange={(e) => setAdminForm(f => ({ ...f, first_name: e.target.value }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Last Name"
                      fullWidth
                      size="small"
                      value={adminForm.last_name}
                      onChange={(e) => setAdminForm(f => ({ ...f, last_name: e.target.value }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Email Address"
                      type="email"
                      fullWidth
                      size="small"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Password"
                      type="password"
                      fullWidth
                      size="small"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm(f => ({ ...f, password: e.target.value }))}
                      required
                      helperText="Must be at least 8 characters"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={adminSubmitting}
                      sx={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #34d399, #10b981)'
                        }
                      }}
                    >
                      {adminSubmitting ? 'Creating...' : 'Create Admin Account'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Payroll Config */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Payroll Configuration</Typography>
              <FormControlLabel control={<Switch id="pf-enabled" checked={form.pf_enabled} onChange={(e) => set('pf_enabled', e.target.checked)} color="primary" />} label="Enable PF Deduction (12%)" sx={{ display: 'block', mb: 1 }} />
              <FormControlLabel control={<Switch id="esi-enabled" checked={form.esi_enabled} onChange={(e) => set('esi_enabled', e.target.checked)} color="primary" />} label="Enable ESI Deduction (0.75%)" sx={{ display: 'block', mb: 1 }} />
              <FormControlLabel control={<Switch id="pt-enabled" checked={form.pt_enabled} onChange={(e) => set('pt_enabled', e.target.checked)} color="primary" />} label="Enable Professional Tax" sx={{ display: 'block' }} />
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Attendance Rules</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField id="settings-start-time" label="Work Start Time" type="time" fullWidth
                    value={form.work_start_time} onChange={(e) => set('work_start_time', e.target.value)}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField id="settings-end-time" label="Work End Time" type="time" fullWidth
                    value={form.work_end_time} onChange={(e) => set('work_end_time', e.target.value)}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={4}>
                  <TextField id="settings-grace" label="Grace (mins)" type="number" fullWidth
                    value={form.grace_minutes} onChange={(e) => set('grace_minutes', e.target.value)}
                    inputProps={{ min: 0, max: 60, step: 5 }} />
                </Grid>
                <Grid item xs={4}>
                  <TextField id="settings-half-day" label="Half Day Hours" type="number" fullWidth
                    value={form.half_day_hours} onChange={(e) => set('half_day_hours', e.target.value)}
                    inputProps={{ min: 1, max: 12, step: 0.5 }} />
                </Grid>
                <Grid item xs={4}>
                  <TextField id="settings-min-hours" label="Full Day Min Hours" type="number" fullWidth
                    value={form.minimum_working_hours} onChange={(e) => set('minimum_working_hours', e.target.value)}
                    inputProps={{ min: 1, max: 14, step: 0.5 }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Leave Quotas (per year)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}><TextField id="settings-casual" label="Casual" type="number" fullWidth value={form.casual_leave_quota} onChange={(e) => set('casual_leave_quota', e.target.value)} inputProps={{ min: 0, max: 30 }} /></Grid>
                <Grid item xs={4}><TextField id="settings-sick" label="Sick" type="number" fullWidth value={form.sick_leave_quota} onChange={(e) => set('sick_leave_quota', e.target.value)} inputProps={{ min: 0, max: 30 }} /></Grid>
                <Grid item xs={4}><TextField id="settings-earned" label="Earned" type="number" fullWidth value={form.earned_leave_quota} onChange={(e) => set('earned_leave_quota', e.target.value)} inputProps={{ min: 0, max: 30 }} /></Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
