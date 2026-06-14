import { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Chip, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, IconButton,
  Select, FormControl, InputLabel, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField
} from '@mui/material';
import { CheckCircle, Cancel, Refresh, Close } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { leaveAPI } from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

export default function AdminLeave() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectDialog, setRejectDialog] = useState({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.list({ status: filter });
      setLeaves(res.data.results || res.data);
    } catch { toast.error('Failed to load leave requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, [filter]);

  const handleApprove = async (id) => {
    try {
      await leaveAPI.approve(id);
      toast.success('Leave approved!');
      fetchLeaves();
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Rejection reason required'); return; }
    try {
      await leaveAPI.reject(rejectDialog.id, rejectReason);
      toast.success('Leave rejected');
      setRejectDialog({ open: false, id: null });
      setRejectReason('');
      fetchLeaves();
    } catch { toast.error('Failed to reject'); }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Leave Management</Typography>
          <Typography variant="body2" color="text.secondary">Review and approve employee leave requests</Typography>
        </Box>
        <Tooltip title="Refresh"><IconButton onClick={fetchLeaves} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}><Refresh /></IconButton></Tooltip>
      </Box>

      <FormControl size="small" sx={{ mb: 3, minWidth: 160 }}>
        <InputLabel>Filter by Status</InputLabel>
        <Select id="leave-filter" value={filter} label="Filter by Status" onChange={(e) => setFilter(e.target.value)}>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="">All</MenuItem>
        </Select>
      </FormControl>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase' } }}>
                <TableCell>Employee</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell align="center">Days</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
              ) : leaves.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No {filter} leave requests</TableCell></TableRow>
              ) : (
                leaves.map((leave) => (
                  <TableRow key={leave.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell><Typography variant="body2" fontWeight={600}>{leave.employee_name || leave.employee}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{leave.leave_type}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{leave.from_date}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{leave.to_date}</Typography></TableCell>
                    <TableCell align="center"><Chip label={leave.number_of_days || '?'} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: 'primary.main' }} /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leave.reason}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip label={leave.status} size="small" sx={{ bgcolor: `${statusColors[leave.status]}20`, color: statusColors[leave.status], fontWeight: 600, textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell align="center">
                      {leave.status === 'pending' && (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Approve">
                            <IconButton id={`approve-leave-${leave.id}`} size="small" onClick={() => handleApprove(leave.id)} sx={{ color: '#10b981' }}>
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton id={`reject-leave-${leave.id}`} size="small" onClick={() => setRejectDialog({ open: true, id: leave.id })} sx={{ color: 'error.main' }}>
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, id: null })} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography fontWeight={700}>Reject Leave Request</Typography>
          <IconButton onClick={() => setRejectDialog({ open: false, id: null })} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField id="reject-reason" label="Rejection Reason" fullWidth multiline rows={3} required
            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} inputProps={{ maxLength: 500 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setRejectDialog({ open: false, id: null })}>Cancel</Button>
          <Button id="confirm-reject-btn" variant="contained" color="error" onClick={handleReject}>Reject Leave</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
