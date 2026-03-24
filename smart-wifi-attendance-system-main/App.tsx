import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, off, set, remove, update, get } from 'firebase/database'; // 'update' add pannirukaen
import { app } from './components/firebase';
import emailjs from '@emailjs/browser'; 
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Component imports
import LandingPage from './components/LandingPage';
import StaffDashboard from './components/StaffDashboard';
import StudentPortalNew from './components/StudentPortal';
import HotspotAccessGate from './components/HotspotAccessGate';
import { StudentAttendanceRecord, Student } from './types';
import { excelService } from './services/excelService';

interface ErrorBoundaryProps { children: React.ReactNode; }

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      setHasError(true);
      setError(error.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050a] text-white p-6 text-center">
        <div className="max-w-xl bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8">
          <h1 className="text-2xl font-bold text-[#ff007a] mb-4">Something went wrong</h1>
          <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-[#00d1ff] text-black font-bold rounded-xl hover:bg-[#00ffa3]">RELOAD SYSTEM</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const Home = () => {
  const navigate = useNavigate();
  return <LandingPage onStaffClick={() => navigate('/staff')} onStudentClick={() => navigate('/student')} />;
};

const db = getDatabase(app);

export default function App() {
  const [records, setRecords] = useState<{ id: string; data: StudentAttendanceRecord }[]>([]);
  const [allStudents, setAllStudents] = useState<Record<string, Student>>({});

  const SERVICE_ID = "service_ov2ed0c";
  const TEMPLATE_ID = "template_8l5je3k";
  const PUBLIC_KEY = "lY_7i4-3Fv9oPY7Oi"; 

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const attendanceRef = ref(db, 'attendance');
    const studentsListener = onValue(studentsRef, (snapshot) => setAllStudents(snapshot.val() || {}));
    const attendanceListener = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      const recordsArray = data ? Object.entries(data).map(([id, record]: [string, any]) => ({ id, data: record })).reverse() : [];
      setRecords(recordsArray);
    });
    return () => { off(studentsRef); off(attendanceRef); };
  }, []);

  // DELETE STUDENT FEATURE
  const handleDeleteStudent = async (regNo: string) => {
    if (window.confirm(`Delete student ${regNo}?`)) {
      try {
        await remove(ref(db, `students/${regNo}`));
        alert("Student removed successfully!");
      } catch (error) { console.error("Delete Error:", error); }
    }
  };

  // ✅ ADDED: DELETE ATTENDANCE RECORD (Ithu illathathala thaan blank screen vandhuchu)
  const handleDeleteAttendanceRecord = async (recordId: string) => {
    if (window.confirm("Delete this attendance record?")) {
      try {
        await remove(ref(db, `attendance/${recordId}`));
        alert("Record deleted!");
      } catch (error) {
        console.error("Delete Record Error:", error);
      }
    }
  };

  // WIPE DEVICE ID - Enhanced to clear from attendance records
  const handleWipeDevice = async (regNo: string) => {
    if (window.confirm(`⚠️ WARNING: This will reset ALL device and mobile bindings for ${regNo}!\n\nThe student will be able to use this register number on a new device.\n\nContinue?`)) {
      try {
        // Clear device binding from students collection
        await update(ref(db, `students/${regNo}`), { deviceId: null });

        // ===== CRITICAL: Clear device bindings from ALL attendance records =====
        // This allows the register number to be used on a new device
        const attendanceRef = ref(db, 'attendance');
        const attendanceSnap = await get(attendanceRef);
        const attendanceData = attendanceSnap.val() || {};

        const updates: { [key: string]: any } = {};

        // Find all attendance records for this register number and clear device bindings
        Object.entries(attendanceData).forEach(([recordId, record]: [string, any]) => {
          if (record.regNo === regNo) {
            // Clear device binding from this attendance record
            updates[`attendance/${recordId}/deviceId`] = null;
            updates[`attendance/${recordId}/deviceFingerprint`] = null;
            console.log(`Clearing device binding for attendance record ${recordId}`);
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
          console.log(`Cleared device bindings for ${Object.keys(updates).length} attendance records`);
        }

        alert(`✅ Device and mobile bindings reset for ${regNo}!\n\nThe student can now use this register number on a new device.`);
      } catch (error) {
        console.error("Wipe Error:", error);
        alert("Error resetting device binding. Please try again.");
      }
    }
  };

  const handleStudentSubmitAttendance = (data: any) => {
    try {
      const submissionData = { ...data, date: new Date().toLocaleDateString() };
      set(ref(db, `attendance/${Date.now()}`), submissionData);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      emailjs.send(SERVICE_ID, TEMPLATE_ID, { reg_no: data.regNo, otp_code: otp }, PUBLIC_KEY);
    } catch (error) { console.error('Error:', error); }
  };

  // Export all attendance records to Excel
  const handleExportAllAttendance = () => {
    const exportData = records.map(record => ({
      name: record.data.name || 'Unknown',
      regNo: record.data.regNo || '',
      status: record.data.status || 'Unknown',
      time: record.data.time || '',
      date: record.data.date || new Date().toLocaleDateString()
    }));
    excelService.exportAttendanceToExcel(exportData, `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export only present students to Excel
  const handleExportPresentList = () => {
    const presentStudents = records.filter(record => record.data.status === 'Present' || record.data.status === 'present');
    if (presentStudents.length === 0) {
      alert('No present students found for today');
      return;
    }
    const exportData = presentStudents.map(record => ({
      name: record.data.name || 'Unknown',
      regNo: record.data.regNo || '',
      status: 'Present',
      time: record.data.time || '',
      date: record.data.date || new Date().toLocaleDateString()
    }));
    excelService.exportAttendanceToExcel(exportData, `Present_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <HotspotAccessGate>
      <Router>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/student" element={<StudentPortalNew onSubmitAttendance={handleStudentSubmitAttendance} onLogout={() => window.location.href = '/'} />} />
            <Route path="/staff" element={<StaffDashboard records={records} allStudents={allStudents} onSendEmails={async () => {}} onExport={handleExportPresentList} onExportAll={handleExportAllAttendance} onLogout={() => window.location.href = '/'} onDeleteStudent={handleDeleteStudent} onDeleteAttendanceRecord={handleDeleteAttendanceRecord} onWipeDevice={handleWipeDevice} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </Router>
    </HotspotAccessGate>
  );
}