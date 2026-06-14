import { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, InputAdornment, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Business, Close, Refresh
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { departmentAPI } from '../../services/api';
import toast from 'react-hot-toast';

const defaultForm = { department_name: '', department_code: '', description: '', status: 'active' };

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, dept: null });
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentAPI.list({ search });
      setDepartments(res.data.results || res.data);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, [search]);

  const openCreate = () => { setForm(defaultForm); setEditId(null); setDialogOpen(true); };
  const openEdit = (dept) => {
    setForm({ department_name: dept.department_name, department_code: dept.department_code, description: dept.description, status: dept.status });
    setEditId(dept.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.department_name.trim() || !form.department_code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await departmentAPI.update(editId, form);
        toast.success('Department updated!');
      } else {
        await departmentAPI.create(form);
        toast.success('Department created!');
      }
      setDialogOpen(false);
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await departmentAPI.delete(deleteDialog.dept.id);
      toast.success('Department deleted');
      setDeleteDialog({ open: false, dept: null });
      fetchDepartments();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <Layout>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Departments</Typography>
          <Typography variant="body2" color="text.secondary">Manage company departments</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchDepartments} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            id="create-department-btn"
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
              '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' },
            }}
          >
            Add Department
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <TextField
        id="department-search"
        placeholder="Search departments..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
        }}
        sx={{ mb: 3, width: 300 }}
      />

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Employees</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading...</TableCell></TableRow>
              ) : departments.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No departments found</TableCell></TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, transition: 'background 0.2s' }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business sx={{ color: 'primary.main', fontSize: 18 }} />
                        <Typography variant="body2" fontWeight={700} color="primary.main">{dept.department_code}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2" fontWeight={600}>{dept.department_name}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{dept.description || '—'}</Typography></TableCell>
                    <TableCell align="center">
                      <Chip label={dept.employee_count} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: 'primary.main' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={dept.status}
                        size="small"
                        sx={{
                          bgcolor: dept.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: dept.status === 'active' ? '#10b981' : '#ef4444',
                          fontWeight: 600, textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton id={`edit-dept-${dept.id}`} size="small" onClick={() => openEdit(dept)} sx={{ color: 'primary.main' }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton id={`delete-dept-${dept.id}`} size="small" onClick={() => setDeleteDialog({ open: true, dept })} sx={{ color: 'error.main', ml: 0.5 }}>
                          <Delete fontSize="small" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>{editId ? 'Edit Department' : 'Create Department'}</Typography>
          <IconButton onClick={() => setDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField id="dept-code" label="Department Code" fullWidth required value={form.department_code}
            onChange={(e) => setForm({ ...form, department_code: e.target.value.toUpperCase() })}
            inputProps={{ maxLength: 20 }} sx={{ mb: 2, mt: 1 }} />
          <TextField id="dept-name" label="Department Name" fullWidth required value={form.department_name}
            onChange={(e) => setForm({ ...form, department_name: e.target.value })}
            inputProps={{ maxLength: 100 }} sx={{ mb: 2 }} />
          <TextField id="dept-desc" label="Description" fullWidth multiline rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            inputProps={{ maxLength: 500 }} sx={{ mb: 2 }} />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select id="dept-status" value={form.status} label="Status"
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button id="save-dept-btn" variant="contained" onClick={handleSave} disabled={saving}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, dept: null })}
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Delete Department?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteDialog.dept?.department_name}</strong>?</Typography>
          <Typography variant="caption" color="error.main">This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, dept: null })}>Cancel</Button>
          <Button id="confirm-delete-dept" color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
