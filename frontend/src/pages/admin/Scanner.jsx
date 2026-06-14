import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Avatar, Divider
} from '@mui/material';
import {
  QrCodeScanner, StopCircle, AccessTime, Logout as LogoutIcon,
  People, HowToReg, PanTool, Refresh, UploadFile
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { attendanceAPI, dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CHECK_IN_COLOR = '#6366f1';
const CHECK_OUT_COLOR = '#10b981';
const ERROR_COLOR = '#ef4444';

// Isolated camera container — rendered ONCE, never unmounted by React
function CameraContainer({ elementId }) {
  return (
    <Box
      id={elementId}
      sx={{
        width: '100%',
        minHeight: 280,
        bgcolor: 'rgba(0,0,0,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    />
  );
}

export default function AdminScanner() {
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState('auto'); // 'auto', 'check_in', 'check_out'
  const [recentScans, setRecentScans] = useState([]);
  const [lastScan, setLastScan] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef(null);
  const ELEMENT_ID = 'qr-reader-camera';

  const fetchStats = useCallback(async () => {
    try {
      const res = await dashboardAPI.admin();
      setStats({
        total: res.data.total_employees || 0,
        present: res.data.present_today || 0,
        absent: (res.data.total_employees || 0) - (res.data.present_today || 0),
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleScan = useCallback(async (decodedText) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const res = await attendanceAPI.scan(decodedText, scanMode);
      const data = res.data;
      const isCheckIn = !!data.in_time;
      const scanRecord = {
        id: Date.now(),
        employee_name: data.employee_name,
        employee_code: data.employee_code,
        time: data.in_time || data.out_time || new Date().toLocaleTimeString('en-IN'),
        type: isCheckIn ? 'Check-In' : 'Check-Out',
        status: 'Success',
        detail: data.detail,
        working_hours: data.working_hours || null,
      };
      setLastScan(scanRecord);
      setRecentScans(prev => [scanRecord, ...prev].slice(0, 15));
      toast.success(data.detail);
      fetchStats();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Scan Failed';
      const errScan = {
        id: Date.now(),
        employee_name: 'Unknown',
        employee_code: '—',
        time: new Date().toLocaleTimeString('en-IN'),
        type: 'Error',
        status: 'Rejected',
        detail,
      };
      setLastScan(errScan);
      setRecentScans(prev => [errScan, ...prev].slice(0, 15));
      toast.error(detail);
    }

    setTimeout(() => { processingRef.current = false; }, 3000);
  }, [fetchStats, scanMode]);

  const startScanning = useCallback(async () => {
    try {
      // Dynamically import to avoid issues
      const { Html5Qrcode } = await import('html5-qrcode');

      // Ensure the element exists and is empty
      const el = document.getElementById(ELEMENT_ID);
      if (!el) {
        toast.error('Camera container not ready. Please try again.');
        return;
      }
      // Clear any leftover html5-qrcode elements
      el.innerHTML = '';

      scannerRef.current = new Html5Qrcode(ELEMENT_ID);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decodedText) => handleScan(decodedText),
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      toast.error('Failed to start camera. Please allow camera access.');
    }
  }, [handleScan]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.warn('Stop scanner warning:', e);
      }
      // Clear the container manually to avoid DOM conflicts
      const el = document.getElementById(ELEMENT_ID);
      if (el) el.innerHTML = '';
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      let scanner = scannerRef.current;
      if (!scanner) {
        const el = document.getElementById(ELEMENT_ID);
        if (el) el.innerHTML = '';
        scanner = new Html5Qrcode(ELEMENT_ID);
      }

      const decodedText = await scanner.scanFile(file, true);
      await handleScan(decodedText);
    } catch (err) {
      console.error(err);
      toast.error('Could not find a valid QR code in the uploaded image.');
    } finally {
      event.target.value = ''; // Reset input
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  const typeColor = (type) => {
    if (type === 'Check-In') return CHECK_IN_COLOR;
    if (type === 'Check-Out') return CHECK_OUT_COLOR;
    return ERROR_COLOR;
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>QR Attendance Scanner</Typography>
          <Typography variant="body2" color="text.secondary">
            Scan employee permanent QR cards — auto detects check-in / check-out
          </Typography>
        </Box>
        <Button size="small" startIcon={<Refresh />} onClick={fetchStats} variant="outlined" sx={{ borderRadius: 2 }}>
          Refresh Stats
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Employees', value: stats.total, color: '#6366f1', icon: <People /> },
          { label: 'Present Today', value: stats.present, color: '#10b981', icon: <HowToReg /> },
          { label: 'Absent Today', value: stats.absent, color: '#ef4444', icon: <PanTool /> },
        ].map((s) => (
          <Grid item xs={4} key={s.label}>
            <Card sx={{ borderBottom: `3px solid ${s.color}` }}>
              <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10}>{s.label}</Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ color: s.color, lineHeight: 1.2 }}>{s.value}</Typography>
                </Box>
                <Box sx={{ color: s.color, opacity: 0.5 }}>{s.icon}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Left: Camera */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCodeScanner sx={{ color: 'primary.main' }} /> Camera Scanner
              </Typography>

              {/* Scan Mode Selector */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1} sx={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Scanner Option Mode
                </Typography>
                <Grid container spacing={1}>
                  {[
                    { mode: 'auto', label: 'Auto Detect', desc: 'In/Out automatic', color: '#6366f1' },
                    { mode: 'check_in', label: 'Check In', desc: 'Force Check-In', color: '#10b981' },
                    { mode: 'check_out', label: 'Check Out', desc: 'Force Check-Out', color: '#f97316' }
                  ].map((m) => (
                    <Grid item xs={4} key={m.mode}>
                      <Card
                        onClick={() => setScanMode(m.mode)}
                        sx={{
                          cursor: 'pointer',
                          textAlign: 'center',
                          p: 1.2,
                          border: `2px solid ${scanMode === m.mode ? m.color : 'rgba(255,255,255,0.06)'}`,
                          bgcolor: scanMode === m.mode ? `${m.color}15` : 'background.paper',
                          backgroundImage: 'none',
                          transition: 'all 0.2s ease-in-out',
                          transform: scanMode === m.mode ? 'translateY(-2px)' : 'none',
                          boxShadow: scanMode === m.mode ? `0 4px 10px ${m.color}20` : 'none',
                          '&:hover': {
                            borderColor: m.color,
                            bgcolor: `${m.color}08`,
                          }
                        }}
                      >
                        <Typography variant="body2" fontWeight={700} sx={{ color: scanMode === m.mode ? m.color : 'text.primary', fontSize: 11 }}>
                          {m.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 8 }}>
                          {m.desc}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Camera viewport — ALWAYS mounted, never removed by React */}
              <Box sx={{
                border: scanning
                  ? '2px solid rgba(99,102,241,0.6)'
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2,
                minHeight: 280,
                position: 'relative',
                boxShadow: scanning ? '0 0 20px rgba(99,102,241,0.3)' : 'none',
                transition: 'all 0.3s ease',
                bgcolor: 'rgba(0,0,0,0.3)',
              }}>
                {/* This div is always in the DOM — html5-qrcode injects into it */}
                <div id={ELEMENT_ID} style={{ width: '100%', minHeight: '280px' }} />

                {/* Overlay shown when not scanning */}
                {!scanning && (
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1,
                  }}>
                    <QrCodeScanner sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                    <Typography color="text.secondary" variant="body2">Camera is off</Typography>
                    <Typography color="text.secondary" variant="caption">Click Start to activate</Typography>
                  </Box>
                )}
                
                {/* Hidden file input for uploading QR images */}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload} 
                />
              </Box>

              {scanning ? (
                <Button variant="outlined" color="error" fullWidth startIcon={<StopCircle />}
                  onClick={stopScanning} sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}>
                  Stop Scanner
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" fullWidth startIcon={<QrCodeScanner />}
                    onClick={startScanning}
                    sx={{
                      py: 1.5, fontWeight: 700, borderRadius: 2,
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                      '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' },
                    }}>
                    Start Camera
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<UploadFile />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      py: 1.5, fontWeight: 700, borderRadius: 2,
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: 'text.primary',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.05)' }
                    }}>
                    Upload Image
                  </Button>
                </Box>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                🔒 1st scan = Check-In &nbsp;|&nbsp; 2nd scan = Check-Out
              </Typography>
            </CardContent>
          </Card>

          {/* Last Scan Result */}
          {lastScan && (
            <Card sx={{
              border: `1px solid ${lastScan.status === 'Success'
                ? (lastScan.type === 'Check-In' ? `${CHECK_IN_COLOR}50` : `${CHECK_OUT_COLOR}50`)
                : `${ERROR_COLOR}50`}`,
              background: lastScan.status === 'Success'
                ? (lastScan.type === 'Check-In' ? 'rgba(99,102,241,0.06)' : 'rgba(16,185,129,0.06)')
                : 'rgba(239,68,68,0.06)',
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{
                    bgcolor: typeColor(lastScan.type) + '30',
                    color: typeColor(lastScan.type),
                    width: 48, height: 48, fontSize: 18, fontWeight: 800,
                  }}>
                    {lastScan.employee_name?.[0] || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={800}>{lastScan.employee_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{lastScan.employee_code}</Typography>
                  </Box>
                  <Chip
                    label={lastScan.type}
                    icon={lastScan.type === 'Check-In'
                      ? <AccessTime sx={{ fontSize: 14 }} />
                      : <LogoutIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      bgcolor: typeColor(lastScan.type) + '20',
                      color: typeColor(lastScan.type),
                      fontWeight: 700, fontSize: 12,
                    }}
                  />
                </Box>
                <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">{lastScan.detail}</Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ color: typeColor(lastScan.type) }}>
                    {lastScan.time}
                  </Typography>
                </Box>
                {lastScan.working_hours && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Total hours: {parseFloat(lastScan.working_hours).toFixed(2)}h
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right: Scan Log */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Scan Log</Typography>
                <Typography variant="caption" color="text.secondary">Today's scanning session</Typography>
              </Box>
              <Button size="small" variant="text" onClick={() => { setRecentScans([]); setLastScan(null); }} sx={{ color: 'text.secondary' }}>
                Clear
              </Button>
            </Box>
            <TableContainer sx={{ maxHeight: 580, overflowY: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: 'background.paper', fontWeight: 700, color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                    <TableCell>Time</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell align="center">Type</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentScans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                        <QrCodeScanner sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.2, mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography color="text.secondary" variant="body2">No scans yet</Typography>
                        <Typography color="text.secondary" variant="caption">Start the camera and scan an employee QR card</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentScans.map((scan) => (
                      <TableRow key={scan.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ color: typeColor(scan.type) }}>
                            {scan.time}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{scan.employee_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{scan.employee_code}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={scan.type}
                            sx={{ bgcolor: typeColor(scan.type) + '15', color: typeColor(scan.type), fontWeight: 600, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={scan.status}
                            sx={{
                              bgcolor: scan.status === 'Success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: scan.status === 'Success' ? '#10b981' : '#ef4444',
                              fontWeight: 600, fontSize: 11,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
