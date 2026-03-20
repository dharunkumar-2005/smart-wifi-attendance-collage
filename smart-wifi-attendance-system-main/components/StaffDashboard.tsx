import { emailService } from '../services/emailService';
import React, { useState, useMemo, useEffect } from 'react';
import { LogOut, Trash2, Plus, Search, Mail, Download, Users, AlertTriangle, Lock, Settings, Unlock } from 'lucide-react';
import { MemoizedPresentItem, MemoizedAbsentItem, MemoizedStudentListItem } from './MemoizedListItems';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { validatePasswordStrength, hashPassword, comparePassword } from '../utils/passwordUtils';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getDatabase, ref, set, remove, update } from 'firebase/database';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AdminDashboardComponentProps {
  records: { id: string; data: { name: string; regNo: string; time: string; date: string; photo?: string } }[];
  allStudents: Record<string, { name: string; email?: string; deviceId?: string }>;
  onLogout: () => void;
  onSendEmails?: (callback?: (sentRegNos: string[]) => void) => void;
  onExport?: () => void;
  onExportAll?: () => void;
  onAddStudent?: (studentData: { name: string; regNo: string; email: string }) => Promise<void>;
  onDeleteStudent?: (regNo: string) => Promise<void>;
  onDeleteAttendanceRecord?: (recordId: string) => Promise<void>;
  onWipeDevice?: (regNo: string) => Promise<void>;
}

const AdminDashboardComponent: React.FC<AdminDashboardComponentProps> = ({
  records,
  allStudents,
  onLogout,
  onSendEmails,
  onExport,
  onExportAll,
  onAddStudent,
  onDeleteStudent,
  onDeleteAttendanceRecord,
  onWipeDevice
}) => {
  const [view, setView] = useState('dashboard');
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const STAFF_PASSWORD = 'KNCET@Staff2026';
  
  // Student Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [newStudent, setNewStudent] = useState({ name: '', regNo: '', email: '' });
  const [addingStudent, setAddingStudent] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailsSentTo, setEmailsSentTo] = useState<Set<string>>(new Set());

  // Realtime DB reference used for student management and password updates
  const realtimeDatabase = useMemo(() => getDatabase(), []);

  // Password Authentication Handler
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    
    if (passwordInput.trim() === STAFF_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordInput('');
    } else {
      setPasswordError('Invalid Password! Access Denied.');
      setPasswordInput('');
    }
  };

  // Handle Logout
  const handleStaffLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setPasswordError(null);
    onLogout();
  };

  // Send single absence email via emailService for debugging/status
  const sendAbsenceEmail = async (name: string, regNo: string, email: string) => {
    try {
      const params = {
        parent_email: email,
        student_name: name,
        registration_number: regNo,
        attendance_date: new Date().toISOString().split('T')[0]
      };
      const resp = await emailService.sendAbsenceAlert(params);
      if (resp.success) console.log('Email sent to', email);
      else console.error('Email failed for', email, resp.message);
    } catch (err) {
      console.error('Email send error', err);
    }
  };

  // Student management actions (Realtime Database)
  const handleAddStudent = async () => {
    const name = newStudent.name.trim();
    const regNo = newStudent.regNo.trim().toUpperCase();
    const email = newStudent.email.trim();

    if (!name || !regNo) {
      setMessage({ type: 'error', text: '❌ Name and Reg No are required' });
      return;
    }

    setAddingStudent(true);
    setMessage(null);

    try {
      const studentRef = ref(realtimeDatabase, `students/${regNo}`);
      await set(studentRef, {
        name,
        regNo,
        email: email || '',
        deviceId: ''
      });

      setMessage({ type: 'success', text: `✅ ${name} added successfully!` });
      setNewStudent({ name: '', regNo: '', email: '' });
      setTimeout(() => setMessage(null), 3000);

      // Notify parent component if it wants to handle it too
      if (onAddStudent) {
        await onAddStudent({ name, regNo, email });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to add student'}` });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleDeleteStudent = async (regNo: string) => {
    if (!window.confirm(`Delete student ${regNo}?`)) return;
    try {
      await remove(ref(realtimeDatabase, `students/${regNo}`));
      setMessage({ type: 'success', text: `✅ Student ${regNo} deleted` });
      if (onDeleteStudent) await onDeleteStudent(regNo);
      setTimeout(() => setMessage(null), 2500);
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error deleting student: ${error instanceof Error ? error.message : ''}` });
    }
  };

  const handleWipeDevice = async (regNo: string) => {
    if (!window.confirm(`Wipe device binding for ${regNo}?`)) return;
    try {
      await update(ref(realtimeDatabase, `students/${regNo}`), { deviceId: '' });
      setMessage({ type: 'success', text: `✅ Device binding wiped for ${regNo}` });
      if (onWipeDevice) await onWipeDevice(regNo);
      setTimeout(() => setMessage(null), 2500);
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error wiping device: ${error instanceof Error ? error.message : ''}` });
    }
  };

  const handleDeleteAttendanceRecord = async (recordId: string) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await remove(ref(realtimeDatabase, `attendance/${recordId}`));
      setMessage({ type: 'success', text: '✅ Attendance record deleted' });
      if (onDeleteAttendanceRecord) await onDeleteAttendanceRecord(recordId);
      setTimeout(() => setMessage(null), 2500);
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error deleting record: ${error instanceof Error ? error.message : ''}` });
    }
  };

  // wrapper used by buttons to send alerts and track state
  const triggerAbsenceAlerts = async () => {
    try {
      // compute absentee list from props as a quick path
      const emailsToSend = absentList
        .filter(s => (s as any).email)
        .map(s => ({
          parent_email: (s as any).email,
          student_name: s.name,
          registration_number: s.regNo,
          attendance_date: new Date().toISOString().split('T')[0]
        }));

      if (emailsToSend.length === 0) {
        setMessage({ type: 'error', text: '❌ No configured parent emails to send' });
        return;
      }

      if (!emailService.verifyConfiguration()) {
        setMessage({ type: 'error', text: '❌ EmailJS not configured. Check services/emailService.ts' });
        return;
      }

      const results = await emailService.sendBulkAbsenceAlerts(emailsToSend);
      // mark sent regNos in local state
      const sent = absentList.slice(0, results.sent).map(s => s.regNo);
      setEmailsSentTo(new Set([...Array.from(emailsSentTo), ...sent]));
      onSendEmails?.(sent);
      if (results.sent > 0) setMessage({ type: 'success', text: `✅ Sent ${results.sent} absence alerts` });
      if (results.failed > 0) setMessage({ type: 'error', text: `❌ ${results.failed} failed to send` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: `❌ Error sending alerts: ${err instanceof Error ? err.message : ''}` });
    }
  };

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [storedPasswordHash, setStoredPasswordHash] = useState<string | null>(null);

  // load password hash from firebase so change-password form validates against latest value
  useEffect(() => {
    // Try to load admin password hash from Firestore once
    (async () => {
      try {
        const cfgDoc = doc(db, 'admin', 'config');
        const snap = await getDoc(cfgDoc);
        if (snap.exists()) {
          const val = snap.data();
          if (val && (val as any).password && (val as any).password.hash) {
            setStoredPasswordHash((val as any).password.hash);
          }
        }
      } catch (err) {
        // ignore silently
      }
    })();
  }, []);

  // Calculate metrics
  const totalStudents = Object.keys(allStudents).length;
  const presentCount = records.length;
  const attendancePercentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : '0.0';

  // Generate absent list with useMemo to prevent unnecessary calculations
  const absentList = useMemo(() => {
    const presentRegNos = records.map(r => r.data.regNo);
    return Object.entries(allStudents)
      .filter(([regNo]) => !presentRegNos.includes(regNo))
      .map(([regNo, details]: [string, any]) => ({ regNo, name: (details as any).name }));
  }, [records, allStudents]);

  return (
    <>
      {!isAuthenticated ? (
        // PASSWORD LOGIN SCREEN
        <div className="min-h-screen bg-gradient-to-br from-[#05050a] via-[#0a0a15] to-[#05050a] text-white flex items-center justify-center p-4 relative overflow-hidden">
          {/* ANIMATED BACKGROUNDS */}
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#ff007a] rounded-full blur-[150px] opacity-15 animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00d1ff] rounded-full blur-[150px] opacity-15 animate-pulse"></div>

          <div className="relative z-10 w-full max-w-md">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
              {/* HEADER */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-black tracking-tighter mb-2">
                  STAFF <span className="text-[#ff007a]">PORTAL</span>
                </h1>
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <Lock size={16} />
                  <span>Secure Access Required</span>
                </div>
              </div>

              {/* LOGIN FORM */}
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    STAFF PASSWORD
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Enter your password"
                    className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#00d1ff] focus:outline-none transition-all"
                    autoFocus
                  />
                </div>

                {/* ERROR MESSAGE */}
                {passwordError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                    <p className="text-red-300 text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle size={18} />
                      {passwordError}
                    </p>
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#00d1ff] to-[#0099ff] text-black font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(0,209,255,0.4)] transition-all transform hover:scale-105"
                >
                  UNLOCK DASHBOARD
                </button>
              </form>

              {/* FOOTER */}
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-gray-400 text-xs">
                  KNCET Official Attendance Management System
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // MAIN DASHBOARD (shows only if authenticated)
      <div className="min-h-screen bg-gradient-to-br from-[#05050a] via-[#0a0a15] to-[#05050a] text-white p-4 md:p-8 overflow-hidden relative">
      
      {/* ANIMATED BACKGROUNDS */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#ff007a] rounded-full blur-[150px] opacity-15 animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00d1ff] rounded-full blur-[150px] opacity-15 animate-pulse"></div>

      <div className="relative z-10">
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between px-8 py-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">
              STAFF PORTAL <span className="text-[#ff007a]">DASHBOARD</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Real-time Attendance Management System</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">{new Date().toLocaleDateString()}</p>
              <p className="text-2xl font-black text-[#00d1ff]">{attendancePercentage}%</p>
            </div>
            <button
              onClick={handleStaffLogout}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all"
            >
              <LogOut className="w-4 h-4" />
              LOGOUT
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mb-8 flex gap-3 flex-wrap">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'attendance', label: '👥 Attendance' },
            { id: 'students', label: '👨‍🎓 Students' },
            { id: 'reports', label: '📋 Reports' },
            { id: 'security', label: '🔐 Security' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                view === tab.id
                  ? 'bg-[#ff007a] shadow-[0_0_30px_#ff007a] text-white'
                  : 'bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Students', value: totalStudents, color: 'from-[#ff007a]' },
                { label: 'Present Today', value: presentCount, color: 'from-[#00ffa3]' },
                { label: 'Absent Today', value: absentList.length, color: 'from-red-500' },
                { label: 'Attendance Rate', value: `${attendancePercentage}%`, color: 'from-[#00d1ff]' }
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className={`bg-gradient-to-br ${stat.color} via-transparent to-transparent/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all`}
                >
                  <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">{stat.label}</p>
                  <p className="text-4xl font-black">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* CHART & CONTROLS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CHART */}
              <div className="lg:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-[30px] border border-white/10">
                <h3 className="text-lg font-black mb-6 text-[#00d1ff]">ATTENDANCE OVERVIEW</h3>
                <div className="flex justify-center">
                  <div className="relative w-[300px] h-[300px]">
                    <Doughnut
                      data={{
                        labels: ['Present', 'Absent'],
                        datasets: [{
                          data: [presentCount, absentList.length],
                          backgroundColor: ['#00ffa3', '#ff007a'],
                          borderWidth: 3,
                          borderColor: '#05050a',
                        }]
                      }}
                      options={{
                        cutout: '75%',
                        plugins: {
                          legend: { display: false }
                        }
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black text-[#00d1ff]">{presentCount}</span>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">PRESENT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-[30px] border border-white/10">
                <h3 className="text-lg font-black mb-6">ACTIONS</h3>
                <div className="space-y-3">
                  <button
                    onClick={onExport}
                    className="w-full py-3 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-bold text-sm hover:shadow-[0_0_20px_#00d1ff] transition-all"
                  >
                    📥 EXPORT PRESENT LIST TO EXCEL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE VIEW */}
        {view === 'attendance' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* PRESENT */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-[30px] border border-white/10">
              <h3 className="text-lg font-black mb-6 text-[#00ffa3]">PRESENT TODAY ({presentCount})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reg No</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Time</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length > 0 ? (
                      records.map((record) => (
                        <tr key={record.id} className="border-b border-white/5">
                          <td className="py-4 text-white">{record.data.name}</td>
                          <td className="py-4 text-white">{record.data.regNo}</td>
                          <td className="py-4 text-white">{record.data.time}</td>
                          <td className="py-4">
                            <button
                              onClick={() => handleDeleteAttendanceRecord(record.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-400">No attendance recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ABSENT */}
            {absentList.length > 0 && (
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-[30px] border border-red-500/20">
                <h3 className="text-lg font-black mb-6 text-red-500">ABSENT LIST ({absentList.length})</h3>
                <div className="grid gap-4">
                  {absentList.map((student) => (
                    <MemoizedAbsentItem
                      key={student.regNo}
                      name={student.name}
                      regNo={student.regNo}
                      emailSent={emailsSentTo.has(student.regNo)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STUDENT MANAGEMENT VIEW */}
        {view === 'students' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* ADD STUDENT SECTION */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-[30px] border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#00d1ff]/20 border border-[#00d1ff] rounded-xl">
                  <Plus className="w-5 h-5 text-[#00d1ff]" />
                </div>
                <h3 className="text-lg font-black text-[#00d1ff]">ADD NEW STUDENT</h3>
              </div>
              
              {message && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-bold border ${
                  message.type === 'success'
                    ? 'bg-[#00ffa3]/10 border-[#00ffa3] text-[#00ffa3]'
                    : 'bg-red-500/10 border-red-500 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}
              
              <div className="grid md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Name</label>
                  <input
                    type="text"
                    placeholder="Student Name"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/20 p-3 rounded-xl text-white placeholder-gray-600 focus:border-[#00d1ff] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Reg No</label>
                  <input
                    type="text"
                    placeholder="Reg Number"
                    value={newStudent.regNo}
                    onChange={(e) => setNewStudent({ ...newStudent, regNo: e.target.value.toUpperCase() })}
                    className="w-full bg-black/50 border border-white/20 p-3 rounded-xl text-white placeholder-gray-600 focus:border-[#00d1ff] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Email</label>
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full bg-black/50 border border-white/20 p-3 rounded-xl text-white placeholder-gray-600 focus:border-[#00d1ff] focus:outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleAddStudent}
                  disabled={addingStudent}
                  className="px-6 py-3 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-bold text-sm hover:shadow-[0_0_20px_#00d1ff] transition-all disabled:opacity-50"
                >
                  {addingStudent ? 'ADDING...' : '➕ ADD'}
                </button>
              </div>
            </div>

            {/* SEARCH STUDENTS SECTION */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-[30px] border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#ff007a]/20 border border-[#ff007a] rounded-xl">
                  <Users className="w-5 h-5 text-[#ff007a]" />
                </div>
                <h3 className="text-lg font-black text-[#ff007a]">MANAGE STUDENTS</h3>
                <div className="ml-auto text-sm font-bold text-gray-400">{Object.keys(allStudents).length} Total</div>
              </div>

              {/* SEARCH BAR */}
              <div className="mb-6 flex items-center gap-2 bg-black/50 border border-white/20 p-3 rounded-xl">
                <Search className="w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name or registration number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none"
                />
              </div>

              {/* STUDENTS LIST */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reg No</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Email</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Device ID</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredStudents = Object.entries(allStudents).filter(([regNo, student]: [string, any]) => {
                        const searchLower = searchQuery.toLowerCase();
                        return (
                          regNo.toLowerCase().includes(searchLower) ||
                          (student.name || '').toLowerCase().includes(searchLower)
                        );
                      });

                      if (filteredStudents.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-gray-400">
                              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                              <p>{searchQuery ? 'No students found matching your search' : 'No students registered'}</p>
                            </td>
                          </tr>
                        );
                      }

                      return filteredStudents.map(([regNo, student]: [string, any]) => (
                        <tr key={regNo} className="border-b border-white/5">
                          <td className="py-4 text-white">{student.name || 'Unnamed'}</td>
                          <td className="py-4 text-white">{regNo}</td>
                          <td className="py-4 text-white">{student.email || 'N/A'}</td>
                          <td className="py-4 text-white font-mono text-xs">{student.deviceId || 'Not Set'}</td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleWipeDevice(regNo)}
                                className="px-3 py-1 bg-yellow-500 text-black rounded-lg text-xs font-bold hover:bg-yellow-600 transition-all"
                              >
                                Wipe Device
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(regNo)}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS VIEW */}
        {view === 'reports' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* EXPORT REPORTS SECTION */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-[30px] border border-white/10">
              <h3 className="text-lg font-black mb-6">EXPORT REPORTS</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-gray-400 text-sm mb-4">Generate Excel attendance report with all student data</p>
                  <button
                    onClick={onExportAll}
                    className="w-full py-3 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-bold text-sm"
                  >
                    📊 EXPORT EXCEL
                  </button>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-gray-400 text-sm mb-4">Download the list of present students in Excel format</p>
                  <button
                    onClick={onExport}
                    className="w-full py-3 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-bold text-sm hover:shadow-[0_0_20px_#00d1ff] transition-all"
                  >
                    📥 EXPORT PRESENT LIST TO EXCEL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY VIEW */}
        {view === 'security' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* CHANGE PASSWORD SECTION */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-[30px] border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#ff007a]/20 border border-[#ff007a] rounded-xl">
                  <Lock className="w-5 h-5 text-[#ff007a]" />
                </div>
                <h3 className="text-lg font-black text-[#ff007a]">CHANGE PASSWORD</h3>
              </div>

              {message && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-bold border ${
                  message.type === 'success'
                    ? 'bg-[#00ffa3]/10 border-[#00ffa3] text-[#00ffa3]'
                    : 'bg-red-500/10 border-red-500 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();

                  if (!currentPassword.trim()) {
                    setMessage({ type: 'error', text: '❌ Please enter your current password' });
                    return;
                  }

                  if (!newPassword.trim()) {
                    setMessage({ type: 'error', text: '❌ Please enter a new password' });
                    return;
                  }

                  if (newPassword !== confirmPassword) {
                    setMessage({ type: 'error', text: '❌ Passwords do not match' });
                    return;
                  }

                  if (currentPassword === newPassword) {
                    setMessage({ type: 'error', text: '❌ New password must be different from current password' });
                    return;
                  }

                  const passwordStrength = validatePasswordStrength(newPassword);
                  if (!passwordStrength.isValid) {
                    setMessage({ type: 'error', text: `❌ ${passwordStrength.errors[0]}` });
                    return;
                  }

                  // Validate current password against stored hash or fallback to default
                  const isValidCurrent = storedPasswordHash
                    ? comparePassword(currentPassword, storedPasswordHash)
                    : currentPassword === 'admin123';

                  if (!isValidCurrent) {
                    setMessage({ type: 'error', text: '❌ Incorrect current password' });
                    return;
                  }

                  setChangingPassword(true);
                  setMessage(null);

                  try {
                    // update password in realtime database
                    const passwordRef = ref(realtimeDatabase, 'admin/config/password');
                    const hashed = hashPassword(newPassword);
                    await set(passwordRef, {
                      hash: hashed,
                      lastUpdated: new Date().toISOString()
                    });

                    // update local copy so further checks use latest
                    setStoredPasswordHash(hashed);

                    setMessage({
                      type: 'success',
                      text: '✅ Password updated successfully!'
                    });
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setTimeout(() => setMessage(null), 3000);
                  } catch (error) {
                    setMessage({
                      type: 'error',
                      text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to update password'}`
                    });
                  } finally {
                    setChangingPassword(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white placeholder-gray-600 focus:border-[#ff007a] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white placeholder-gray-600 focus:border-[#ff007a] focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-gray-500 mt-2">
                    • Minimum 8 characters • Uppercase letter • Lowercase letter • Number • Special character
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 p-4 rounded-xl text-white placeholder-gray-600 focus:border-[#ff007a] focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#ff007a] to-[#ff1493] text-white rounded-xl font-bold text-sm hover:shadow-[0_0_30px_#ff007a] transition-all disabled:opacity-50"
                >
                  {changingPassword ? '⏳ UPDATING...' : '🔐 UPDATE PASSWORD'}
                </button>
              </form>

              {/* Security Tips */}
              <div className="mt-8 pt-8 border-t border-white/10">
                <h4 className="text-sm font-bold text-[#00d1ff] mb-4">🛡️ Security Tips:</h4>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li>✓ Use a strong, unique password</li>
                  <li>✓ Don't share your password with anyone</li>
                  <li>✓ Change your password regularly</li>
                  <li>✓ Never use the same password for multiple accounts</li>
                  <li>✓ Use a combination of letters, numbers, and symbols</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GPU ACCELERATION STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @supports (will-change: transform) {
          .group {
            will-change: transform;
          }
          .animate-pulse {
            will-change: opacity;
          }
        }
        
        /* Enable 3D acceleration for cards */
        .bg-gradient-to-br {
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        /* Optimize transitions */
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }
        
        /* GPU accelerate hover effects */
        .group:hover {
          transform: translateZ(0);
        }
      `}} />
    </div>
      )}
    </>
  );
};

export default AdminDashboardComponent;
