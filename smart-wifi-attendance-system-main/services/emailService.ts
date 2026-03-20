import emailjs from '@emailjs/browser';

// 1. Configuration
const ADMIN_OTP_SERVICE = 'service_ov2ed0c';
const ADMIN_OTP_TEMPLATE = 'template_8l5je3k';
const STAFF_NOTIFICATION_EMAIL = 'dharunkumar0011@gmail.com';

// IMPORTANT: Inga unga Public Key-ah marakkama podunga anna
const PUBLIC_KEY = 'YOUR_ACTUAL_PUBLIC_KEY'; 

emailjs.init(PUBLIC_KEY);

export interface EmailParams {
  parent_email: string;
  student_name: string;
  registration_number: string;
  attendance_date: string;
}

// Intha variable-ah backend (memory)-la OTP-ah store panna use pannuvom
let lastGeneratedOTP: string = '';

export const emailService = {
  /**
   * 1. Send OTP to Admin - Ippo ithu generation logic-oda serthu irukkum
   */
  sendOTPEmail: async (studentName: string, regNo: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    try {
      // Automatic-ah ingeye OTP generate aagum
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      lastGeneratedOTP = otp; // Idha memory-la store pannikirom verify panna

      const templateParams = {
        to_email: STAFF_NOTIFICATION_EMAIL,
        student_name: studentName,
        reg_no: regNo,
        otp_code: otp, // Intha 'otp_code' unga EmailJS template-la {{otp_code}} nu irukanum
      };

      const response = await emailjs.send(ADMIN_OTP_SERVICE, ADMIN_OTP_TEMPLATE, templateParams);
      
      // Safety-kaga OTP-ah return pandrom (Frontend-la verify panna)
      return { success: response.status === 200, message: 'OTP Sent to Admin', otp: otp };
    } catch (error) {
      console.error('OTP Error:', error);
      return { success: false, message: 'OTP send panna mudiyala' };
    }
  },

  /**
   * 2. Verify OTP - Frontend-la irunthu input varum pothu check panna
   */
  verifyOTP: (inputOTP: string): boolean => {
    return inputOTP === lastGeneratedOTP;
  },

  /**
   * 3. Send Single Absence Alert
   */
  sendAbsenceAlert: async (params: EmailParams): Promise<{ success: boolean; message: string }> => {
    try {
      const templateParams = {
        to_email: params.parent_email,
        student_name: params.student_name,
        registration_number: params.registration_number,
        attendance_date: params.attendance_date,
      };

      const response = await emailjs.send(ADMIN_OTP_SERVICE, 'template_absent_alert', templateParams);
      return { success: response.status === 200, message: 'Alert Sent' };
    } catch (error) {
      console.error('Alert Error:', error);
      return { success: false, message: 'Error sending alert' };
    }
  },

  /**
   * 4. Bulk Alerts
   */
  sendBulkAbsenceAlerts: async (absentStudents: EmailParams[]): Promise<{ sent: number; failed: number; errors: string[] }> => {
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const student of absentStudents) {
      try {
        const response = await emailService.sendAbsenceAlert(student);
        if (response.success) results.sent++;
        else {
          results.failed++;
          results.errors.push(`${student.student_name} failed`);
        }
      } catch (err) {
        results.failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return results;
  },

  verifyConfiguration: (): boolean => {
    return !!ADMIN_OTP_SERVICE && !!PUBLIC_KEY && PUBLIC_KEY !== 'YOUR_ACTUAL_PUBLIC_KEY';
  }
};