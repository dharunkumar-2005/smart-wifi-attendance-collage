
/**
 * Attendance Record Structure
 */
export interface AttendanceRecord {
  id: string;
  registerNumber: string;
  date: string;
  time: string;
  networkSsid: string;
  status: 'Verified' | 'Pending';
}

/**
 * Network State Information
 */
export interface NetworkState {
  isConnected: boolean;
  ssid: string;
  strength: number;
}

/**
 * Student Information
 */
export interface Student {
  name: string;
  email?: string;
  parentEmail?: string;
  regNo?: string;
  enrollmentDate?: string;
  status?: 'active' | 'inactive';
}

/**
 * Attendance Record (Firebase)
 */
export interface StudentAttendanceRecord {
  name: string;
  regNo: string;
  face?: string;
  time?: string;
  date?: string;
  status?: string;
}

/**
 * Dashboard Statistics
 */
export interface DashboardStats {
  totalRegistered: number;
  presentToday: number;
  absentToday: number;
  attendancePercentage: string;
  timestamp: Date;
}

/**
 * Email Alert Parameters
 */
export interface EmailAlertParams {
  parent_email: string;
  student_name: string;
  registration_number: string;
  attendance_date: string;
  parent_name?: string;
}

/**
 * Absent Student Information
 */
export interface AbsentStudent {
  name: string;
  regNo: string;
  parentEmail?: string;
  lastSeen?: string;
}

/**
 * Excel Export Data
 */
export interface ExcelExportData {
  name: string;
  regNo: string;
  status: 'Present' | 'Absent';
  time?: string;
  date: string;
}

/**
 * Daily Statistics
 */
export interface DailyStatistics {
  date: string;
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  attendancePercentage: number;
}

/**
 * Student Analytics
 */
export interface StudentAnalytics {
  name: string;
  regNo: string;
  totalDaysPresent: number;
  totalDaysAbsent: number;
  attendanceRate: string;
}

/**
 * Firebase Database Structure Types
 */
export interface FirebaseStudentsDB {
  [regNo: string]: Student;
}

export interface FirebaseAttendanceDB {
  [recordId: string]: StudentAttendanceRecord;
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

/**
 * Email Service Response
 */
export interface EmailServiceResponse {
  success: boolean;
  message: string;
  sent?: number;
  failed?: number;
  errors?: string[];
}
