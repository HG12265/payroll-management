import { useState, useEffect } from 'react';
import {
  Box, Button, Card, Typography, Grid, Chip, Tooltip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, FormControl, InputLabel, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, LinearProgress
} from '@mui/material';
import { AttachMoney, PlayArrow, Refresh } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { payrollAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminPayroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [generateDialog, setGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResults, setGenResults] = useState(null);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.list({ month, year });
      setPayrolls(res.data.results || res.data);
    } catch { toast.error('Failed to load payroll data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayrolls(); }, [month, year]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResults(null);
    try {
      const res = await payrollAPI.generate(month, year);
      setGenResults(res.data);
      toast.success(`Payroll generated for ${res.data.total} employees`);
      fetchPayrolls();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const statusColor = { draft: '#6366f1', processed: '#10b981', paid: '#f59e0b' };

  const totalNetSalary = payrolls.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0);

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Payroll</Typography>
          <Typography variant="body2" color="text.secondary">Process monthly payroll for all employees</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh"><IconButton onClick={fetchPayrolls} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}><Refresh /></IconButton></Tooltip>
          <Button
            id="generate-payroll-btn"
            variant="contained" startIcon={<PlayArrow />}
            onClick={() => setGenerateDialog(true)}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.4)', '&:hover': { background: 'linear-gradient(135deg, #34d399, #10b981)' } }}
          >
            Generate Payroll
          </Button>
        </Box>
      </Box>

      {/* Totals Card */}
      {payrolls.length > 0 && (
        <Card sx={{
          mb: 3, p: 2.5, background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',
          border: '1px solid rgba(16,185,129,0.2)'
        }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Total Net Payout — {months[month - 1]} {year}</Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#10b981' }}>
            ₹{totalNetSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Typography>
          <Typography variant="caption" color="text.secondary">{payrolls.length} employees processed</Typography>
        </Card>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Month</InputLabel>
          <Select id="payroll-month" value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
            {months.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select id="payroll-year" value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell align="right">Basic</TableCell>
                <TableCell align="right">Gross</TableCell>
                <TableCell align="right">Deductions</TableCell>
                <TableCell align="right">Net Salary</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
              ) : payrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <AttachMoney sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">No payroll for {months[month - 1]} {year}</Typography>
                    <Typography variant="caption" color="text.secondary">Click "Generate Payroll" to process</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payrolls.map((p) => (
                  <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{p.employee_name}</Typography>
                      <Typography variant="caption" color="primary.main">{p.employee_code}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{p.department}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2">₹{parseFloat(p.basic_salary || 0).toLocaleString('en-IN')}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2">₹{parseFloat(p.gross_salary || 0).toLocaleString('en-IN')}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" color="error.main">-₹{parseFloat(p.total_deductions || 0).toLocaleString('en-IN')}</Typography></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="secondary.main">
                        ₹{parseFloat(p.net_salary || 0).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={p.status} size="small" sx={{ bgcolor: `${statusColor[p.status] || '#6366f1'}20`, color: statusColor[p.status] || '#6366f1', fontWeight: 600, textTransform: 'capitalize' }} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={generateDialog} onClose={() => !generating && setGenerateDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle fontWeight={700}>Generate Payroll</DialogTitle>
        <DialogContent>
          {generating && <LinearProgress sx={{ mb: 2 }} />}
          <Typography variant="body2" color="text.secondary" mb={2}>
            This will calculate and generate payroll for all active employees for <strong>{months[month - 1]} {year}</strong>.
          </Typography>
          {genResults && (
            <Alert severity={genResults.results?.some(r => r.status === 'failed') ? 'warning' : 'success'} sx={{ mt: 1 }}>
              Processed {genResults.total} employees.
              {genResults.results?.filter(r => r.status === 'failed').length > 0 && ` ${genResults.results.filter(r => r.status === 'failed').length} failed.`}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setGenerateDialog(false)} disabled={generating}>Cancel</Button>
          <Button id="confirm-generate-payroll" variant="contained" onClick={handleGenerate} disabled={generating}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {generating ? 'Processing...' : `Generate for ${months[month - 1]} ${year}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
