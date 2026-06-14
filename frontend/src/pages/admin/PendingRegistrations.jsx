import { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Grid, IconButton, Tooltip, Alert, CircularProgress
} from '@mui/material';
import { CheckCircle, Cancel, HowToReg, Refresh } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { employeeAPI, departmentAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PendingRegistrations() {
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Approve dialog
  const [approveDialog, setApproveDialog] = useState({ open: false, req: null });
  const [approveForm, setApproveForm] = useState({ department_id: '', designation: '', basic_salary: '' });
  const [approving, setApproving] = useState(false);

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState({ open: false, req: null, reason: '' });
  const [rejecting, setRejecting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, deptRes] = await Promise.all([
        employeeAPI.pending(),
        departmentAPI.list({ status: 'active' })
      ]);
      setRequests(reqRes.data);
      setDepartments(deptRes.data.results || deptRes.data);
    } catch {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openApprove = (req) => {
    setApproveForm({ department_id: '', designation: '', basic_salary: '' });
    setApproveDialog({ open: true, req });
  };

  const handleApprove = async () => {
    const { department_id, designation, basic_salary } = approveForm;
    if (!department_id || !designation || !basic_salary) {
      toast.error('All fields are required');
      return;
    }
    setApproving(true);
    try {
      const res = await employeeAPI.approve(approveDialog.req.id, approveForm);
      toast.success(res.data.detail);
      setApproveDialog({ open: false, req: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await employeeAPI.reject(rejectDialog.req.id, rejectDialog.reason);
      toast.success('Registration rejected');
      setRejectDialog({ open: false, req: null, reason: '' });
      fetchData();
    } catch {
      toast.error('Rejection failed');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Pending Registrations</Typography>
          <Typography variant="body2" color="text.secondary">
            {requests.length} employee{requests.length !== 1 ? 's' : ''} awaiting your approval
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchData} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                <TableCell>Applicant</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Joining Date</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Registered On</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <HowToReg sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">No pending registrations</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.dark', fontSize: 14, fontWeight: 700 }}>
                          {req.full_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{req.full_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{req.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{req.mobile}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {req.joining_date || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.notes || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          size="small" variant="contained" startIcon={<CheckCircle />}
                          onClick={() => openApprove(req)}
                          sx={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)', fontSize: 12 }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small" variant="outlined" color="error" startIcon={<Cancel />}
                          onClick={() => setRejectDialog({ open: true, req, reason: '' })}
                          sx={{ fontSize: 12 }}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* ─── Approve Dialog ─── */}
      <Dialog open={approveDialog.open} onClose={() => setApproveDialog({ open: false, req: null })} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography fontWeight={700}>Approve Registration</Typography>
          {approveDialog.req && (
            <Typography variant="body2" color="text.secondary">{approveDialog.req.full_name} — {approveDialog.req.email}</Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Set the Employment Details for this employee. Basic Salary is only set by admin.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select value={approveForm.department_id} label="Department"
                  onChange={(e) => setApproveForm(f => ({ ...f, department_id: e.target.value }))}>
                  {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.department_name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Designation" fullWidth required
                value={approveForm.designation}
                onChange={(e) => setApproveForm(f => ({ ...f, designation: e.target.value }))}
                inputProps={{ maxLength: 100 }}
                placeholder="e.g. Software Engineer"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Basic Salary (₹)" type="number" fullWidth required
                value={approveForm.basic_salary}
                onChange={(e) => setApproveForm(f => ({ ...f, basic_salary: e.target.value }))}
                inputProps={{ min: 0, step: 1000 }}
                helperText="This is set only by admin and not visible to the employee during registration."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setApproveDialog({ open: false, req: null })} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleApprove} disabled={approving}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {approving ? 'Approving...' : 'Approve & Create Employee'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Reject Dialog ─── */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, req: null, reason: '' })} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle>
          <Typography fontWeight={700}>Reject Registration</Typography>
          {rejectDialog.req && <Typography variant="body2" color="text.secondary">{rejectDialog.req.full_name}</Typography>}
        </DialogTitle>
        <DialogContent>
          <TextField label="Reason for rejection (optional)" fullWidth multiline rows={3}
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog(r => ({ ...r, reason: e.target.value }))}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setRejectDialog({ open: false, req: null, reason: '' })} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={rejecting}>
            {rejecting ? 'Rejecting...' : 'Reject Registration'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
