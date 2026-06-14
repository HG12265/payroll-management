import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, CircularProgress, Alert, Divider, Tabs, Tab
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, EmailOutlined, PersonOutline, PhoneOutlined } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0); // 0 = Login, 1 = Register

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [reg, setReg] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm_password: '',
    mobile: '', joining_date: '', notes: ''
  });
  const [showRegPass, setShowRegPass] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // ── LOGIN ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      toast.success(`Welcome back, ${user.first_name}!`);
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403) {
        setLoginError(detail || 'Your account is pending admin approval.');
      } else {
        setLoginError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ── REGISTER ───────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    if (reg.password !== reg.confirm_password) {
      setRegError('Passwords do not match.');
      return;
    }
    if (reg.password.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }
    setRegLoading(true);
    try {
      await authAPI.register({
        first_name: reg.first_name.trim(),
        last_name: reg.last_name.trim(),
        email: reg.email.trim().toLowerCase(),
        password: reg.password,
        mobile: reg.mobile.trim(),
        joining_date: reg.joining_date || null,
        notes: reg.notes.trim(),
      });
      setRegSuccess(true);
    } catch (err) {
      setRegError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const setR = (key, val) => setReg(r => ({ ...r, [key]: val }));

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 50%, #0f172a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <Box sx={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: '20%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <Card sx={{
        width: '100%', maxWidth: tab === 1 ? 520 : 440,
        mx: 2,
        background: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        transition: 'max-width 0.3s ease',
      }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: 2,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 1.5,
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}>
              <LockOutlined sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              PayrollPro
            </Typography>
            <Typography variant="caption" color="text.secondary">Staff Payroll Management System</Typography>
          </Box>

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setLoginError(''); setRegError(''); setRegSuccess(false); }}
            variant="fullWidth"
            sx={{
              mb: 3,
              '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #6366f1, #10b981)', height: 3, borderRadius: 2 },
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14 },
            }}
          >
            <Tab label="Sign In" id="tab-login" />
            <Tab label="Register" id="tab-register" />
          </Tabs>

          {/* ═══ LOGIN FORM ═══ */}
          {tab === 0 && (
            <>
              {loginError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{loginError}</Alert>}
              <Box component="form" onSubmit={handleLogin} noValidate>
                <TextField
                  id="login-email" label="Email Address" type="email" fullWidth required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" inputProps={{ maxLength: 254 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                  sx={{ mb: 2.5 }}
                />
                <TextField
                  id="login-password" label="Password" type={showPass ? 'text' : 'password'}
                  fullWidth required value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" inputProps={{ maxLength: 128 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton id="toggle-password-visibility" onClick={() => setShowPass(!showPass)} edge="end">
                          {showPass ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ mb: 3 }}
                />
                <Button id="login-submit-btn" type="submit" fullWidth variant="contained" size="large"
                  disabled={loginLoading}
                  sx={{
                    py: 1.5, background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                    '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)', transform: 'translateY(-1px)' },
                    transition: 'all 0.2s ease',
                  }}>
                  {loginLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
                Secure login powered by JWT authentication
              </Typography>
            </>
          )}

          {/* ═══ REGISTER FORM ═══ */}
          {tab === 1 && (
            <>
              {regSuccess ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ fontSize: 48, mb: 2 }}>✅</Box>
                  <Typography variant="h6" fontWeight={700} color="success.main" mb={1}>
                    Registration Submitted!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Your account is pending admin approval. You will be able to login once the admin reviews your request.
                  </Typography>
                  <Button variant="outlined" onClick={() => { setTab(0); setRegSuccess(false); }}>
                    Go to Sign In
                  </Button>
                </Box>
              ) : (
                <>
                  {regError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{regError}</Alert>}
                  <Box component="form" onSubmit={handleRegister} noValidate>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField id="reg-first-name" label="First Name" fullWidth required
                        value={reg.first_name} onChange={(e) => setR('first_name', e.target.value)}
                        inputProps={{ maxLength: 100 }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                      />
                      <TextField id="reg-last-name" label="Last Name" fullWidth required
                        value={reg.last_name} onChange={(e) => setR('last_name', e.target.value)}
                        inputProps={{ maxLength: 100 }}
                      />
                    </Box>
                    <TextField id="reg-email" label="Email Address" type="email" fullWidth required
                      value={reg.email} onChange={(e) => setR('email', e.target.value)}
                      inputProps={{ maxLength: 254 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                      sx={{ mb: 2 }}
                    />
                    <TextField id="reg-mobile" label="Mobile Number" fullWidth required
                      value={reg.mobile} onChange={(e) => setR('mobile', e.target.value)}
                      inputProps={{ maxLength: 15 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><PhoneOutlined sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField id="reg-password" label="Password" type={showRegPass ? 'text' : 'password'}
                        fullWidth required value={reg.password} onChange={(e) => setR('password', e.target.value)}
                        inputProps={{ maxLength: 128 }} helperText="Min 8 characters"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowRegPass(!showRegPass)} edge="end" size="small">
                                {showRegPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                      <TextField id="reg-confirm-password" label="Confirm Password" type="password"
                        fullWidth required value={reg.confirm_password} onChange={(e) => setR('confirm_password', e.target.value)}
                        inputProps={{ maxLength: 128 }}
                      />
                    </Box>
                    <TextField id="reg-joining-date" label="Expected Joining Date" type="date" fullWidth
                      value={reg.joining_date} onChange={(e) => setR('joining_date', e.target.value)}
                      InputLabelProps={{ shrink: true }} sx={{ mb: 2 }}
                    />
                    <TextField id="reg-notes" label="Notes / Position Applied For (optional)" fullWidth multiline rows={2}
                      value={reg.notes} onChange={(e) => setR('notes', e.target.value)}
                      inputProps={{ maxLength: 500 }} sx={{ mb: 3 }}
                    />
                    <Button id="register-submit-btn" type="submit" fullWidth variant="contained" size="large"
                      disabled={regLoading}
                      sx={{
                        py: 1.5,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
                        '&:hover': { background: 'linear-gradient(135deg, #34d399, #10b981)', transform: 'translateY(-1px)' },
                        transition: 'all 0.2s ease',
                      }}>
                      {regLoading ? <CircularProgress size={24} color="inherit" /> : 'Submit Registration'}
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                    After submitting, an admin will review and approve your account.
                  </Typography>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
