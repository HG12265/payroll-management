import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button,
  Select, FormControl, InputLabel, MenuItem, Divider, Chip
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { Download, Assessment } from '@mui/icons-material';
import Layout from '../../components/Layout';
import { reportsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdminReports() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState('payroll');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let res;
      if (reportType === 'payroll') res = await reportsAPI.payroll({ month, year });
      else if (reportType === 'attendance') res = await reportsAPI.attendance({ month, year });
      else res = await reportsAPI.leave({ month, year });
      setData(res.data);
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const chartColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Reports</Typography>
        <Typography variant="body2" color="text.secondary">Generate payroll, attendance, and leave reports</Typography>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3, p: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Report Type</InputLabel>
            <Select id="report-type" value={reportType} label="Report Type" onChange={(e) => setReportType(e.target.value)}>
              <MenuItem value="payroll">Payroll Report</MenuItem>
              <MenuItem value="attendance">Attendance Report</MenuItem>
              <MenuItem value="leave">Leave Report</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Month</InputLabel>
            <Select id="report-month" value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
              {months.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel>Year</InputLabel>
            <Select id="report-year" value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <Button
            id="generate-report-btn"
            variant="contained" startIcon={<Assessment />}
            onClick={fetchReport} disabled={loading}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </Box>
      </Card>

      {/* Summary Cards */}
      {data?.summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.entries(data.summary).map(([key, val], i) => (
            <Grid item xs={6} sm={3} key={key}>
              <Card sx={{ p: 2, position: 'relative', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: chartColors[i % chartColors.length] } }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', display: 'block' }}>
                  {key.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: chartColors[i % chartColors.length] }}>
                  {typeof val === 'number' && val > 1000 ? `₹${val.toLocaleString('en-IN')}` : val}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Chart */}
      {data?.chart_data && data.chart_data.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {months[month - 1]} {year} — {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.chart_data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                {data.chart_keys?.map((key, i) => (
                  <Bar key={key} dataKey={key} fill={chartColors[i % chartColors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!data && !loading && (
        <Card sx={{ textAlign: 'center', p: 6 }}>
          <Assessment sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
          <Typography color="text.secondary">Select report type and period, then click Generate</Typography>
        </Card>
      )}
    </Layout>
  );
}
