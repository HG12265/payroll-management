import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, CircularProgress, Divider
} from '@mui/material';
import { AttachMoney, TrendingUp, TrendingDown } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { payrollAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployeePayroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    payrollAPI.list().then(res => setPayrolls(res.data.results || res.data))
      .catch(() => toast.error('Failed to load payroll history'))
      .finally(() => setLoading(false));
  }, []);

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const statusColor = { draft: '#6366f1', processed: '#10b981', paid: '#f59e0b' };

  if (loading) return <Layout><Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box></Layout>;

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>My Payroll</Typography>
        <Typography variant="body2" color="text.secondary">View your monthly salary breakdown</Typography>
      </Box>

      {payrolls.length === 0 ? (
        <Card sx={{ textAlign: 'center', p: 6 }}>
          <AttachMoney sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
          <Typography color="text.secondary">No payroll records yet</Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {payrolls.map((p) => (
            <Grid item xs={12} md={6} key={p.id}>
              <Card sx={{
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' },
              }}>
                <CardContent sx={{ p: 3 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{months[p.month - 1]} {p.year}</Typography>
                      <Chip label={p.status} size="small" sx={{ bgcolor: `${statusColor[p.status]}20`, color: statusColor[p.status], fontWeight: 700, textTransform: 'capitalize', mt: 0.5 }} />
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">Net Salary</Typography>
                      <Typography variant="h5" fontWeight={800} color="secondary.main">
                        ₹{parseFloat(p.net_salary || 0).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />

                  {/* Earnings */}
                  <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <TrendingUp sx={{ fontSize: 14, color: '#10b981' }} /> Earnings
                  </Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {[
                      ['Basic', p.basic_salary],
                      ['HRA', p.hra],
                      ['DA', p.da],
                      ['Medical', p.medical_allowance],
                      ['Travel', p.travel_allowance],
                      ['Bonus', p.bonus],
                    ].filter(([, v]) => parseFloat(v || 0) > 0).map(([label, val]) => (
                      <Grid item xs={6} key={label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="caption" fontWeight={600}>₹{parseFloat(val || 0).toLocaleString('en-IN')}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" fontWeight={700} color="secondary.main">Gross</Typography>
                    <Typography variant="body2" fontWeight={700} color="secondary.main">₹{parseFloat(p.gross_salary || 0).toLocaleString('en-IN')}</Typography>
                  </Box>

                  {/* Deductions */}
                  <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <TrendingDown sx={{ fontSize: 14, color: '#ef4444' }} /> Deductions
                  </Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {[
                      ['PF', p.pf_deduction],
                      ['ESI', p.esi_deduction],
                      ['PT', p.pt_deduction],
                      ['TDS', p.tds_deduction],
                    ].filter(([, v]) => parseFloat(v || 0) > 0).map(([label, val]) => (
                      <Grid item xs={6} key={label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="caption" fontWeight={600} color="error.main">-₹{parseFloat(val || 0).toLocaleString('en-IN')}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" fontWeight={800}>Net Pay</Typography>
                    <Typography variant="body1" fontWeight={800} color="secondary.main">
                      ₹{parseFloat(p.net_salary || 0).toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Layout>
  );
}
