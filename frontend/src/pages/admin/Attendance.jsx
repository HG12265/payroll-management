import { useState, useEffect } from 'react';
import {
  Box, Button, Card, Typography, Grid, Chip, Tooltip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, Select, FormControl, InputLabel, Avatar, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormControlLabel
} from '@mui/material';
import {
  Refresh, CheckCircle, Cancel, Schedule, AccessTime, QrCodeScanner, People, HowToReg,
  Edit, Delete, Add, Save
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { attendanceAPI, dashboardAPI, employeeAPI } from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = {
  Present: '#10b981',
  present: '#10b981',
  Absent: '#ef4444',
  absent: '#ef4444',
  Late: '#f59e0b',
  late: '#f59e0b',
  'Half Day': '#f97316',
  half_day: '#f97316',
};

export default function AdminAttendance() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [day, setDay] = useState('');
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });

  // Dialog & Form States
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' | 'edit'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Form Fields
  const [formEmployee, setFormEmployee] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formStatus, setFormStatus] = useState('present');
  const [formWorkingHours, setFormWorkingHours] = useState('');
  const [formIsManual, setFormIsManual] = useState(true);

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.list({ limit: 1000 });
      setEmployees(res.data.results || res.data);
    } catch {
      toast.error('Failed to load employee list');
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (day) params.day = day;
      const [recRes, dashRes] = await Promise.all([
        attendanceAPI.list(params),
        dashboardAPI.admin().catch(() => ({ data: {} }))
      ]);
      setRecords(recRes.data.results || recRes.data);
      setStats({
        total: dashRes.data.total_employees || 0,
        present: dashRes.data.present_today || 0,
        absent: (dashRes.data.total_employees || 0) - (dashRes.data.present_today || 0),
      });
    } catch {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [month, year, day]);

  const handleSeedMockData = async () => {
    if (!window.confirm('Are you sure you want to generate 30 days of mock attendance data for all registered employees? (Sundays and existing dates will be skipped)')) {
      return;
    }
    setSeeding(true);
    try {
      const res = await attendanceAPI.seedMockData();
      toast.success(res.data.detail || 'Mock attendance seeded successfully!');
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to seed mock attendance data');
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenAdd = () => {
    fetchEmployees();
    setDialogMode('add');
    setSelectedRecord(null);
    setFormEmployee('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCheckIn('');
    setFormCheckOut('');
    setFormStatus('present');
    setFormWorkingHours('');
    setFormIsManual(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (rec) => {
    fetchEmployees();
    setDialogMode('edit');
    setSelectedRecord(rec);
    setFormEmployee(rec.employee || '');
    setFormDate(rec.attendance_date || '');
    setFormCheckIn(rec.check_in_time ? rec.check_in_time.substring(0, 5) : '');
    setFormCheckOut(rec.check_out_time ? rec.check_out_time.substring(0, 5) : '');
    setFormStatus(rec.attendance_status || 'present');
    setFormWorkingHours(rec.working_hours || '');
    setFormIsManual(rec.is_manual !== false);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formEmployee || !formDate) {
      toast.error('Employee and Date are required');
      return;
    }
    setSubmitting(true);
    const payload = {
      employee: formEmployee,
      attendance_date: formDate,
      check_in_time: formCheckIn || null,
      check_out_time: formCheckOut || null,
      attendance_status: formStatus,
      working_hours: formWorkingHours !== '' ? parseFloat(formWorkingHours) : null,
      is_manual: formIsManual,
    };
    try {
      if (dialogMode === 'add') {
        await attendanceAPI.create(payload);
        toast.success('Attendance record created');
      } else {
        await attendanceAPI.update(selectedRecord.id, payload);
        toast.success('Attendance record updated');
      }
      setDialogOpen(false);
      fetchRecords();
    } catch (err) {
      const errDetail = err.response?.data?.detail || Object.values(err.response?.data || {}).flat()[0] || 'Operation failed';
      toast.error(errDetail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (rec) => {
    setRecordToDelete(rec);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setSubmitting(true);
    try {
      await attendanceAPI.delete(recordToDelete.id);
      toast.success('Attendance record deleted');
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      fetchRecords();
    } catch {
      toast.error('Failed to delete attendance record');
    } finally {
      setSubmitting(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Summary from records
  const summary = records.reduce((acc, r) => {
    const key = (r.attendance_status || '').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Attendance</Typography>
          <Typography variant="body2" color="text.secondary">Track daily attendance with permanent employee QR codes</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchRecords} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={handleSeedMockData}
            disabled={seeding}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: 'rgba(255,255,255,0.1)',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.05)' }
            }}
          >
            {seeding ? <CircularProgress size={20} color="inherit" /> : 'Seed Mock Data'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleOpenAdd}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: 'rgba(99,102,241,0.4)',
              color: 'primary.light',
              '&:hover': { bgcolor: 'rgba(99,102,241,0.08)' }
            }}
          >
            Add Record
          </Button>
          <Button
            id="go-to-scanner-btn"
            variant="contained"
            startIcon={<QrCodeScanner />}
            onClick={() => navigate('/admin/scanner')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
              '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' },
            }}
          >
            Open QR Scanner
          </Button>
        </Box>
      </Box>

      {/* Today's live stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Employees', count: stats.total, color: '#6366f1', icon: <People /> },
          { label: 'Present Today', count: stats.present, color: '#10b981', icon: <HowToReg /> },
          { label: 'Present (Month)', count: summary.present || 0, color: '#10b981', icon: <CheckCircle /> },
          { label: 'Absent (Month)', count: summary.absent || 0, color: '#ef4444', icon: <Cancel /> },
          { label: 'Late (Month)', count: summary.late || 0, color: '#f59e0b', icon: <Schedule /> },
          { label: 'Half Day (Month)', count: summary.half_day || 0, color: '#f97316', icon: <AccessTime /> },
        ].map((item) => (
          <Grid item xs={6} sm={4} md={2} key={item.label}>
            <Card sx={{
              position: 'relative', overflow: 'hidden',
              '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: item.color },
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}>
              <Box sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: item.color, lineHeight: 1.2 }}>{item.count}</Typography>
                  </Box>
                  <Box sx={{ color: item.color, opacity: 0.5, mt: 0.5 }}>{item.icon}</Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Month</InputLabel>
          <Select id="att-month" value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
            {months.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select id="att-year" value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Day</InputLabel>
          <Select id="att-day" value={day} label="Day" onChange={(e) => setDay(e.target.value)}>
            <MenuItem value="">All Days</MenuItem>
            {Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1).map(d => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          Showing {records.length} records for {day ? `${day} ` : ''}{months[month - 1]} {year}
        </Typography>
      </Box>

      {/* Attendance Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                <TableCell>Employee</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Check In</TableCell>
                <TableCell align="center">Check Out</TableCell>
                <TableCell align="center">Hours</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <QrCodeScanner sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No attendance records for {months[month - 1]} {year}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use the QR Scanner to mark employee attendance
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button variant="outlined" startIcon={<QrCodeScanner />} onClick={() => navigate('/admin/scanner')}>
                        Go to QR Scanner
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((rec) => (
                  <TableRow key={rec.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark', fontSize: 13, fontWeight: 700 }}>
                          {rec.employee_name?.[0] || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{rec.employee_name}</Typography>
                          <Typography variant="caption" color="primary.main">{rec.employee_code}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{rec.attendance_date}</Typography></TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={rec.check_in_time ? 600 : 400} color={rec.check_in_time ? '#10b981' : 'text.secondary'}>
                        {rec.check_in_time || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={rec.check_out_time ? 600 : 400} color={rec.check_out_time ? '#6366f1' : 'text.secondary'}>
                        {rec.check_out_time || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {rec.working_hours ? `${parseFloat(rec.working_hours).toFixed(1)}h` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={(rec.attendance_status || '').replace('_', ' ')}
                        size="small"
                        sx={{
                          bgcolor: `${statusColors[rec.attendance_status] || '#6366f1'}20`,
                          color: statusColors[rec.attendance_status] || '#6366f1',
                          fontWeight: 600, textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit Record">
                          <IconButton size="small" onClick={() => handleOpenEdit(rec)} sx={{ color: 'primary.light', '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' } }}>
                            <Edit sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Record">
                          <IconButton size="small" onClick={() => handleOpenDelete(rec)} sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
                            <Delete sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add / Edit Attendance Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialogMode === 'add' ? 'Add Manual Attendance' : 'Edit Attendance Record'}
        </DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {dialogMode === 'add' ? (
              <FormControl fullWidth required size="small">
                <InputLabel>Employee</InputLabel>
                <Select
                  value={formEmployee}
                  label="Employee"
                  onChange={(e) => setFormEmployee(e.target.value)}
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.user?.full_name || emp.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="Employee"
                value={selectedRecord ? `${selectedRecord.employee_code} - ${selectedRecord.employee_name}` : ''}
                disabled
                size="small"
                fullWidth
              />
            )}

            <TextField
              label="Date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Check In Time"
                  type="time"
                  value={formCheckIn}
                  onChange={(e) => setFormCheckIn(e.target.value)}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }} // 5 min interval
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Check Out Time"
                  type="time"
                  value={formCheckOut}
                  onChange={(e) => setFormCheckOut(e.target.value)}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth required size="small">
              <InputLabel>Attendance Status</InputLabel>
              <Select
                value={formStatus}
                label="Attendance Status"
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="late">Late</MenuItem>
                <MenuItem value="half_day">Half Day</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
                <MenuItem value="holiday">Holiday</MenuItem>
                <MenuItem value="leave">On Leave</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Working Hours (Manual Override)"
              type="number"
              value={formWorkingHours}
              onChange={(e) => setFormWorkingHours(e.target.value)}
              placeholder="Leave blank to auto-calculate"
              size="small"
              fullWidth
              inputProps={{ step: 0.1, min: 0, max: 24 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formIsManual}
                  onChange={(e) => setFormIsManual(e.target.checked)}
                  color="primary"
                />
              }
              label="Mark as Manual Adjustment"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={<Save />}
              sx={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' },
              }}
            >
              {submitting ? 'Saving...' : 'Save Record'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete the attendance record of{' '}
            <strong>{recordToDelete?.employee_name}</strong> for{' '}
            <strong>{recordToDelete?.attendance_date}</strong>?
          </Typography>
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
            ⚠️ This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
