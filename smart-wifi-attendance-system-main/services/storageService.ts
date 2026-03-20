
import { AttendanceRecord } from '../types';

const STORAGE_KEY = 'smart_attendance_logs';

export const storageService = {
  saveRecord: (registerNumber: string, ssid: string): AttendanceRecord => {
    const logs = storageService.getLogs();
    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      registerNumber,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      networkSsid: ssid,
      status: 'Verified'
    };
    
    const updatedLogs = [newRecord, ...logs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    return newRecord;
  },

  getLogs: (): AttendanceRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  exportToCSV: () => {
    const logs = storageService.getLogs();
    if (logs.length === 0) return;

    const headers = ['Register Number', 'Date', 'Time', 'SSID', 'Status'];
    const rows = logs.map(log => [
      log.registerNumber,
      log.date,
      log.time,
      log.networkSsid,
      log.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  clearLogs: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
