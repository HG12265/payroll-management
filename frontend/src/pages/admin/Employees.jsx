import { useState, useEffect } from 'react';
import {
  Box, Button, Card, Typography, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Chip, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment, Avatar, MenuItem, Select, FormControl, InputLabel,
  Grid, Switch, Alert, CircularProgress
} from '@mui/material';
import {
  Add, Person, Search, Refresh, Visibility, Close,
  CheckCircle, Block, QrCode2, Edit
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { employeeAPI, departmentAPI } from '../../services/api';
import toast from 'react-hot-toast';

const statusColor = { active: '#10b981', inactive: '#f59e0b', terminated: '#ef4444' };

const defaultForm = {
  email: '', first_name: '', last_name: '', password: '',
  department_id: '', designation: '', mobile: '', joining_date: '', basic_salary: ''
};

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState({ open: false, emp: null });
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [toggling, setToggling] = useState(null); // emp id being toggled
  const [generatingQR, setGeneratingQR] = useState(null); // emp id QR being generated
  const [viewLoading, setViewLoading] = useState(null); // emp id detail loading

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        employeeAPI.list({ search }),
        departmentAPI.list({ status: 'active' })
      ]);
      setEmployees(empRes.data.results || empRes.data);
      setDepartments(deptRes.data.results || deptRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [search]);

  const openEdit = async (emp) => {
    setViewLoading(emp.id);
    try {
      const res = await employeeAPI.get(emp.id);
      const detail = res.data;
      setForm({
        email: detail.user?.email || '',
        first_name: detail.user?.first_name || '',
        last_name: detail.user?.last_name || '',
        password: '', // blank initially, if left blank it won't update
        department_id: detail.department?.id || '',
        designation: detail.designation || '',
        mobile: detail.mobile || '',
        joining_date: detail.joining_date || '',
        basic_salary: detail.basic_salary || '',
      });
      setEditId(emp.id);
      setDialogOpen(true);
    } catch {
      toast.error('Failed to load employee details for editing');
    } finally {
      setViewLoading(null);
    }
  };

  const handleSave = async () => {
    const required = ['email', 'first_name', 'last_name', 'department_id', 'designation', 'mobile', 'joining_date', 'basic_salary'];
    if (required.some(f => !form[f])) {
      toast.error('All fields except password are required');
      return;
    }
    if (!editId && !form.password) {
      toast.error('Password is required for new employees');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const payload = { ...form };
        if (!payload.password) {
          delete payload.password;
        }
        await employeeAPI.update(editId, payload);
        toast.success('Employee updated successfully!');
      } else {
        await employeeAPI.create(form);
        toast.success('Employee created successfully!');
      }
      setDialogOpen(false);
      setForm(defaultForm);
      setEditId(null);
      fetchAll();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.email?.[0] || data?.password?.[0] || data?.detail || 'Operation failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    const action = emp.employment_status === 'active' ? 'disable' : 'enable';
    setToggling(emp.id);
    try {
      const res = await employeeAPI.toggleStatus(emp.id, action);
      toast.success(res.data.detail);
      // Update locally for instant UI feedback
      setEmployees(prev => prev.map(e =>
        e.id === emp.id ? { ...e, employment_status: res.data.status } : e
      ));
      // If viewing this employee, update view dialog too
      if (viewDialog.emp?.id === emp.id) {
        setViewDialog(v => ({ ...v, emp: { ...v.emp, employment_status: res.data.status } }));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setToggling(null);
    }
  };

  const handleGenerateQR = async (emp) => {
    setGeneratingQR(emp.id);
    try {
      const res = await employeeAPI.generateQR(emp.id);
      toast.success(res.data.detail);
      if (viewDialog.emp?.id === emp.id) {
        setViewDialog(v => ({ ...v, emp: { ...v.emp, qr_url: res.data.qr_url } }));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'QR generation failed');
    } finally {
      setGeneratingQR(null);
    }
  };

  // Fetch full employee detail (includes qr_url) when clicking View
  const handleViewEmployee = async (emp) => {
    setViewLoading(emp.id);
    try {
      const res = await employeeAPI.get(emp.id);
      const detail = res.data;
      // Merge list fields (full_name, department_name) with detail
      setViewDialog({
        open: true,
        emp: {
          ...emp,
          ...detail,
          full_name: emp.full_name,
          department_name: emp.department_name || detail.department?.department_name,
          qr_url: detail.qr_code_url || null,
        }
      });
    } catch {
      // Fallback to list data
      setViewDialog({ open: true, emp });
    } finally {
      setViewLoading(null);
    }
  };

  return (
    <Layout>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Employees</Typography>
          <Typography variant="body2" color="text.secondary">{employees.length} total employees</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAll} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            id="add-employee-btn"
            variant="contained" startIcon={<Add />}
            onClick={() => { setForm(defaultForm); setEditId(null); setDialogOpen(true); }}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)', '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' } }}
          >
            Add Employee
          </Button>
        </Box>
      </Box>

      <TextField
        id="employee-search" placeholder="Search employees..." size="small"
        value={search} onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> }}
        sx={{ mb: 3, width: 300 }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Designation</TableCell>
                <TableCell align="right">Basic Salary</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Enable / Disable</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No employees found</TableCell></TableRow>
              ) : (
                employees.map((emp) => {
                  const isActive = emp.employment_status === 'active';
                  return (
                    <TableRow key={emp.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, transition: 'background 0.2s', opacity: isActive ? 1 : 0.6 }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 36, height: 36, bgcolor: isActive ? 'primary.dark' : 'grey.700', fontSize: 14, fontWeight: 700 }}>
                            {emp.full_name?.[0] || <Person />}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{emp.full_name}</Typography>
                            <Typography variant="caption" color="primary.main">{emp.employee_code}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2">{emp.department_name}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{emp.designation}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="secondary.main">
                          ₹{parseFloat(emp.basic_salary || 0).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={emp.employment_status || 'active'}
                          size="small"
                          icon={isActive ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : <Block sx={{ fontSize: '14px !important' }} />}
                          sx={{
                            bgcolor: `${statusColor[emp.employment_status] || '#10b981'}20`,
                            color: statusColor[emp.employment_status] || '#10b981',
                            fontWeight: 600, textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={isActive ? 'Click to Disable' : 'Click to Enable'}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <Switch
                              id={`toggle-emp-${emp.id}`}
                              checked={isActive}
                              disabled={toggling === emp.id}
                              onChange={() => handleToggleStatus(emp)}
                              size="small"
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' },
                              }}
                            />
                            <Typography variant="caption" color={isActive ? '#10b981' : 'text.secondary'} fontWeight={600}>
                              {toggling === emp.id ? '...' : isActive ? 'Active' : 'Disabled'}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              id={`view-emp-${emp.id}`}
                              size="small"
                              onClick={() => handleViewEmployee(emp)}
                              disabled={viewLoading === emp.id}
                              sx={{ color: 'primary.main' }}
                            >
                              {viewLoading === emp.id && viewDialog.open === false
                                ? <CircularProgress size={16} />
                                : <Visibility fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Employee">
                            <IconButton
                              id={`edit-emp-${emp.id}`}
                              size="small"
                              onClick={() => openEdit(emp)}
                              disabled={viewLoading === emp.id}
                              sx={{ color: 'secondary.main' }}
                            >
                              {viewLoading === emp.id && dialogOpen === true
                                ? <CircularProgress size={16} />
                                : <Edit fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Employee Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>{editId ? 'Edit Employee' : 'Create New Employee'}</Typography>
          <IconButton onClick={() => setDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Basic Salary is set by Admin only — employees cannot view or change it.
          </Alert>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>Account Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField id="emp-first-name" label="First Name" fullWidth required value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField id="emp-last-name" label="Last Name" fullWidth required value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })} inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField id="emp-email" label="Email Address" type="email" fullWidth required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} inputProps={{ maxLength: 254 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField id="emp-password" label={editId ? "New Password" : "Initial Password"} type="password" fullWidth required={!editId} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} inputProps={{ maxLength: 128 }}
                helperText={editId ? "Min 8 characters (leave blank to keep current)" : "Min 8 characters"} />
            </Grid>
          </Grid>

          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5, mt: 2.5 }}>Employment Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select id="emp-dept" value={form.department_id} label="Department"
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.department_name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField id="emp-designation" label="Designation" fullWidth required value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })} inputProps={{ maxLength: 100 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField id="emp-mobile" label="Mobile Number" fullWidth required value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })} inputProps={{ maxLength: 15 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField id="emp-joining" label="Joining Date" type="date" fullWidth required value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField id="emp-salary" label="Basic Salary (₹)" type="number" fullWidth required value={form.basic_salary}
                onChange={(e) => setForm({ ...form, basic_salary: e.target.value })}
                inputProps={{ min: 0, step: 1000, max: 10000000 }}
                helperText="Admin sets this — not visible to employee" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button id="create-employee-btn" variant="contained" onClick={handleSave} disabled={saving}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            {saving ? (editId ? 'Saving...' : 'Creating...') : (editId ? 'Save Changes' : 'Create Employee')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Employee Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, emp: null })} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>Employee Details</Typography>
          <IconButton onClick={() => setViewDialog({ open: false, emp: null })} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {viewDialog.emp && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: viewDialog.emp.employment_status === 'active' ? 'primary.dark' : 'grey.700', fontSize: 20, fontWeight: 700 }}>
                    {viewDialog.emp.full_name?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{viewDialog.emp.full_name}</Typography>
                    <Chip label={viewDialog.emp.employee_code} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: 'primary.main', fontWeight: 700 }} />
                  </Box>
                </Box>
                {/* Quick toggle in detail view */}
                <Tooltip title={viewDialog.emp.employment_status === 'active' ? 'Disable Account' : 'Enable Account'}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Switch
                      checked={viewDialog.emp.employment_status === 'active'}
                      disabled={toggling === viewDialog.emp.id}
                      onChange={() => handleToggleStatus(viewDialog.emp)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' },
                      }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', color: viewDialog.emp.employment_status === 'active' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {viewDialog.emp.employment_status === 'active' ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
              {[
                ['Email', viewDialog.emp.email],
                ['Department', viewDialog.emp.department_name],
                ['Designation', viewDialog.emp.designation],
                ['Basic Salary', `₹${parseFloat(viewDialog.emp.basic_salary || 0).toLocaleString('en-IN')}`],
                ['Status', viewDialog.emp.employment_status],
              ].map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>{value}</Typography>
                </Box>
              ))}

              {/* QR Code Section */}
              <Box sx={{ mt: 2.5, p: 2, bgcolor: 'rgba(99,102,241,0.06)', borderRadius: 2, border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                  <QrCode2 sx={{ color: 'primary.main', fontSize: 18 }} />
                  <Typography variant="subtitle2" fontWeight={700}>Attendance QR Code</Typography>
                </Box>
                {viewDialog.emp.qr_url ? (
                  <Box>
                    <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 2, display: 'inline-block', mb: 1.5 }}>
                      <img src={viewDialog.emp.qr_url} alt="Employee QR" style={{ width: 120, height: 120, display: 'block' }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button size="small" variant="outlined"
                        href={viewDialog.emp.qr_url} download={`QR_${viewDialog.emp.employee_code}.png`} target="_blank">
                        Download
                      </Button>
                      <Button size="small" variant="outlined" color="warning"
                        startIcon={<QrCode2 />}
                        disabled={generatingQR === viewDialog.emp.id}
                        onClick={() => handleGenerateQR(viewDialog.emp)}>
                        {generatingQR === viewDialog.emp.id ? 'Regenerating...' : 'Regenerate QR'}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      No QR code generated yet for this employee.
                    </Typography>
                    <Button variant="contained" startIcon={<QrCode2 />}
                      disabled={generatingQR === viewDialog.emp.id}
                      onClick={() => handleGenerateQR(viewDialog.emp)}
                      sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                      {generatingQR === viewDialog.emp.id ? 'Generating...' : 'Generate QR Code'}
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
