import * as XLSX from 'xlsx';

export interface AttendanceExportData {
  name: string;
  regNo: string;
  status: 'Present' | 'Absent';
  time?: string;
  date: string;
}

export const excelService = {
  exportAttendanceToExcel: (data: AttendanceExportData[], fileName?: string): void => {
    try {
      if (!data || data.length === 0) {
        alert('No attendance data to export');
        return;
      }

      const preparedData = data.map(record => ({
        'Name': record.name,
        'Registration Number': record.regNo,
        'Status': record.status,
        'Time': record.time || 'N/A',
        'Date': record.date
      }));

      const worksheet = XLSX.utils.json_to_sheet(preparedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

      const timestamp = new Date().toISOString().split('T')[0];
      const finalFileName = fileName || `Attendance_Report_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, finalFileName);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Error exporting file');
    }
  }
};