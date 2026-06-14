import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Tooltip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, FormControl, InputLabel, MenuItem, CircularProgress
} from '@mui/material';
import { Download, Email, Refresh, Receipt } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { payslipAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployeePayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await payslipAPI.list();
      setPayslips(res.data.results || res.data);
    } catch { toast.error('Failed to load payslips'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayslips(); }, []);

  const handleDownload = async (id, payslipNumber) => {
    setDownloading(id);
    try {
      const res = await payslipAPI.download(id);
      // Create blob URL and trigger download
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${payslipNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Payslip downloaded!');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>My Payslips</Typography>
          <Typography variant="body2" color="text.secondary">Download your monthly payslips</Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchPayslips} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      {payslips.length === 0 && !loading ? (
        <Card sx={{ textAlign: 'center', p: 6 }}>
          <Receipt sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
          <Typography color="text.secondary">No payslips available yet</Typography>
          <Typography variant="caption" color="text.secondary">Your payslips will appear here once payroll is processed</Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {loading ? (
            <Box sx={{ textAlign: 'center', width: '100%', py: 4 }}><CircularProgress /></Box>
          ) : (
            payslips.map((slip) => (
              <Box key={slip.id} sx={{ width: '100%', mb: 2 }}>
                <Card sx={{
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.4)' }
                }}>
                  <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{
                        width: 48, height: 48, borderRadius: 2, flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.1))',
                        border: '1px solid rgba(99,102,241,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Receipt sx={{ color: 'primary.main' }} />
                      </Box>
                      <Box>
                        <Typography variant="body1" fontWeight={700}>{months[slip.month - 1]} {slip.year}</Typography>
                        <Typography variant="caption" color="text.secondary">{slip.payslip_number}</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">Net Salary</Typography>
                        <Typography variant="h6" fontWeight={700} color="secondary.main">
                          ₹{parseFloat(slip.net_salary || 0).toLocaleString('en-IN')}
                        </Typography>
                      </Box>
                      <Button
                        id={`download-slip-${slip.id}`}
                        variant="outlined"
                        startIcon={downloading === slip.id ? <CircularProgress size={16} /> : <Download />}
                        onClick={() => handleDownload(slip.id, slip.payslip_number)}
                        disabled={downloading === slip.id}
                        sx={{ borderColor: 'rgba(99,102,241,0.4)', color: 'primary.light', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.08)' } }}
                      >
                        {downloading === slip.id ? 'Downloading...' : 'Download PDF'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))
          )}
        </Grid>
      )}
    </Layout>
  );
}
