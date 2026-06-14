import { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, Select, FormControl, InputLabel, Tooltip
} from '@mui/material';
import { Add, Close, Refresh } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { leaveAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const leaveTypes = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
];

const statusColors = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

const defaultForm = { leave_type: 'casual', from_date: '', to_date: '', reason: '' };

export default function EmployeeLeave() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.list();
      setLeaves(res.data.results || res.data);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleApply = async () => {
    if (!form.from_date || !form.to_date || !form.reason.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (new Date(form.to_date) < new Date(form.from_date)) {
      toast.error('End date cannot be before start date');
      return;
    }
    setSaving(true);
    try {
      await leaveAPI.apply(form);
      toast.success('Leave application submitted!');
      setDialogOpen(false);
      setForm(defaultForm);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Application failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>My Leaves</Typography>
          <Typography variant="body2" color="text.secondary">Apply and track your leave requests</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh"><IconButton onClick={fetchLeaves} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}><Refresh /></IconButton></Tooltip>
          <Button
            id="apply-leave-btn"
            variant="contained" startIcon={<Add />}
            onClick={() => { setForm(defaultForm); setDialogOpen(true); }}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.4)', '&:hover': { background: 'linear-gradient(135deg, #34d399, #10b981)' } }}
          >
            Apply Leave
          </Button>
        </Box>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                <TableCell>Leave Type</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell align="center">Days</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
              ) : leaves.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No leave applications yet</TableCell></TableRow>
              ) : (
                leaves.map((leave) => (
                  <TableRow key={leave.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{leave.leave_type} Leave</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{leave.from_date}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{leave.to_date}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip label={leave.number_of_days || '?'} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: 'primary.main' }} />
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{leave.reason}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip
                        label={leave.status}
                        size="small"
                        sx={{
                          bgcolor: `${statusColors[leave.status]}20`,
                          color: statusColors[leave.status],
                          fontWeight: 600, textTransform: 'capitalize'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Apply Leave Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>Apply for Leave</Typography>
          <IconButton onClick={() => setDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Leave Type</InputLabel>
            <Select id="leave-type" value={form.leave_type} label="Leave Type"
              onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
              {leaveTypes.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField id="leave-from" label="From Date" type="date" fullWidth required
            value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })}
            InputLabelProps={{ shrink: true }} sx={{ mb: 2 }}
            inputProps={{ min: new Date().toISOString().split('T')[0] }} />
          <TextField id="leave-to" label="To Date" type="date" fullWidth required
            value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })}
            InputLabelProps={{ shrink: true }} sx={{ mb: 2 }}
            inputProps={{ min: form.from_date || new Date().toISOString().split('T')[0] }} />
          <TextField id="leave-reason" label="Reason" fullWidth multiline rows={3} required
            value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
            inputProps={{ maxLength: 500 }} helperText={`${form.reason.length}/500`} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button id="submit-leave-btn" variant="contained" onClick={handleApply} disabled={saving}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {saving ? 'Submitting...' : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
