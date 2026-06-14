import { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, InputAdornment, IconButton, Tooltip
} from '@mui/material';
import { Search, Refresh, Security } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { auditAPI } from '../../services/api';
import toast from 'react-hot-toast';

const actionColors = {
  LOGIN: '#10b981', LOGOUT: '#6366f1', ATTENDANCE: '#f59e0b',
  PAYROLL: '#8b5cf6', PAYSLIP: '#f97316', EMPLOYEE_CREATE: '#3b82f6',
  EMPLOYEE_UPDATE: '#06b6d4', SETTINGS: '#ec4899', LEAVE: '#84cc16',
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditAPI.list({ search });
      setLogs(res.data.results || res.data);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [search]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Audit Logs</Typography>
          <Typography variant="body2" color="text.secondary">Security and activity trail</Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchLogs} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <TextField
        id="audit-search" placeholder="Search by user or action..." size="small"
        value={search} onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> }}
        sx={{ mb: 3, width: 320 }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>IP Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Security sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">No audit logs yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{formatTime(log.timestamp)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{log.user_email || 'System'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        sx={{
                          bgcolor: `${actionColors[log.action] || '#6366f1'}20`,
                          color: actionColors[log.action] || '#6366f1',
                          fontWeight: 700, fontSize: 10, letterSpacing: 0.5,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {log.ip_address || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Layout>
  );
}
