import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, IconButton, Chip,
  Select, FormControl, InputLabel, MenuItem, LinearProgress, Alert
} from '@mui/material';
import { Download, Email, Refresh, Receipt, PlayArrow } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { payslipAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await payslipAPI.list({ month, year });
      setPayslips(res.data.results || res.data);
    } catch { toast.error('Failed to load payslips'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayslips(); }, [month, year]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await payslipAPI.generate(month, year);
      toast.success(`Generated ${res.data.total || 0} payslips!`);
      fetchPayslips();
    } catch (err) { toast.error(err.response?.data?.detail || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handleDownload = async (id, num) => {
    setDownloading(id);
    try {
      const res = await payslipAPI.download(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${num}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch { toast.error('Download failed'); }
    finally { setDownloading(null); }
  };

  const handleSendEmail = async (id) => {
    try {
      await payslipAPI.sendEmail(id);
      toast.success('Payslip emailed!');
    } catch { toast.error('Email failed'); }
  };

  const handleBulkEmail = async () => {
    setSendingBulk(true);
    try {
      const res = await payslipAPI.sendBulkEmails(month, year);
      toast.success(`Emailed to ${res.data.sent || 0} employees!`);
    } catch { toast.error('Bulk email failed'); }
    finally { setSendingBulk(false); }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Payslips</Typography>
          <Typography variant="body2" color="text.secondary">Generate and distribute payslips</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Refresh"><IconButton onClick={fetchPayslips} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}><Refresh /></IconButton></Tooltip>
          <Button id="generate-payslips-btn" variant="outlined" startIcon={<PlayArrow />} onClick={handleGenerate} disabled={generating}
            sx={{ borderColor: 'primary.main', color: 'primary.main' }}>
            {generating ? 'Generating...' : 'Generate PDFs'}
          </Button>
          <Button id="bulk-email-btn" variant="contained" startIcon={<Email />} onClick={handleBulkEmail} disabled={sendingBulk}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            {sendingBulk ? 'Sending...' : 'Email All'}
          </Button>
        </Box>
      </Box>

      {(generating || sendingBulk) && <LinearProgress sx={{ mb: 2 }} />}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Month</InputLabel>
          <Select id="payslip-month" value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
            {months.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select id="payslip-year" value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase' } }}>
                <TableCell>Payslip No.</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell align="right">Net Salary</TableCell>
                <TableCell align="center">Generated</TableCell>
                <TableCell align="center">Email Sent</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
              ) : payslips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Receipt sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                    <Typography color="text.secondary">No payslips for {months[month - 1]} {year}</Typography>
                    <Typography variant="caption" color="text.secondary">Process payroll first, then generate PDFs</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payslips.map((slip) => (
                  <TableRow key={slip.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell><Typography variant="body2" fontWeight={700} color="primary.main">{slip.payslip_number}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{slip.employee_name || slip.employee}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={700} color="secondary.main">₹{parseFloat(slip.net_salary || 0).toLocaleString('en-IN')}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="caption" color="text.secondary">{slip.generated_at?.split('T')[0] || '—'}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip label={slip.email_sent ? 'Sent' : 'Not Sent'} size="small"
                        sx={{ bgcolor: slip.email_sent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', color: slip.email_sent ? '#10b981' : '#ef4444', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Download PDF">
                        <IconButton id={`dl-slip-${slip.id}`} size="small" onClick={() => handleDownload(slip.id, slip.payslip_number)} disabled={downloading === slip.id} sx={{ color: 'primary.main' }}>
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Send Email">
                        <IconButton id={`email-slip-${slip.id}`} size="small" onClick={() => handleSendEmail(slip.id)} sx={{ color: 'secondary.main', ml: 0.5 }}>
                          <Email fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
