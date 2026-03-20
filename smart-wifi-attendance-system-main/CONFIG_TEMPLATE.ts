/**
 * EmailJS Configuration Template
 * Copy these values into services/emailService.ts after setting up your EmailJS account
 */

export const EMAIL_CONFIG = {
  // Get these from your EmailJS dashboard
  SERVICE_ID: 'service_xxxxxxxxx', // Replace with your EmailJS Service ID
  TEMPLATE_ID: 'template_xxxxxxxxx', // Replace with your EmailJS Template ID
  PUBLIC_KEY: 'xxxxxxxxxxxxxxxxxxxxxxxx', // Replace with your EmailJS Public Key
};

/**
 * Firebase Configuration Template
 * Copy these values into App.tsx after creating your Firebase project
 */
export const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
};

/**
 * Email Template for EmailJS
 * 
 * Create a new template in EmailJS with these variables:
 * {{parent_name}} - Name of the parent
 * {{student_name}} - Name of the student
 * {{registration_number}} - Student's reg number
 * {{attendance_date}} - Date of absence
 * {{to_email}} - Parent's email address
 * 
 * Suggested HTML Template:
 * 
 * <html>
 *   <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
 *     <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px;">
 *       <h2 style="color: #333;">Attendance Alert</h2>
 *       
 *       <p>Dear {{parent_name}},</p>
 *       
 *       <p>We are writing to inform you that <strong>{{student_name}}</strong> 
 *       (Registration Number: <code>{{registration_number}}</code>) 
 *       was <span style="color: red; font-weight: bold;">ABSENT</span> on 
 *       <strong>{{attendance_date}}</strong>.</p>
 *       
 *       <p style="background-color: #f0f0f0; padding: 10px; border-left: 4px solid #ff007a;">
 *         Please contact the school administration if you have any questions or concerns.
 *       </p>
 *       
 *       <p>Best regards,<br/>
 *       <strong>KNCET School Administration</strong><br/>
 *       Smart Attendance Management System</p>
 *       
 *       <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
 *       
 *       <p style="font-size: 12px; color: #999;">
 *         This is an automated message. Please do not reply to this email.
 *       </p>
 *     </div>
 *   </body>
 * </html>
 */

/**
 * Setup Instructions
 * 
 * 1. FIREBASE SETUP:
 *    - Go to Firebase Console (https://console.firebase.google.com)
 *    - Create a new project
 *    - Enable Realtime Database
 *    - Copy the config values above
 *    - Paste into App.tsx
 * 
 * 2. EMAILJS SETUP:
 *    - Go to EmailJS (https://www.emailjs.com/)
 *    - Sign up for free account
 *    - Add your email service (Gmail recommended)
 *    - Create an email template with variables as shown above
 *    - Copy Service ID, Template ID, and Public Key
 *    - Paste into services/emailService.ts
 * 
 * 3. DATABASE STRUCTURE:
 *    Create these in Firebase Realtime Database:
 *    
 *    /students/{regNo}
 *      - name: string
 *      - parentEmail: string (optional)
 *    
 *    /attendance/{recordId}
 *      - name: string
 *      - regNo: string
 *      - time: string (HH:MM:SS)
 *      - face: string (image URL)
 *      - status: string (optional)
 */

/**
 * Testing Checklist
 * 
 * [ ] Firebase can read/write student records
 * [ ] Attendance records are created successfully
 * [ ] EmailJS credentials are properly configured
 * [ ] Test email sends without errors
 * [ ] Excel export creates valid files
 * [ ] Photos display correctly
 * [ ] Dark theme renders properly
 * [ ] All navigation tabs work
 * [ ] Mobile responsive design works
 */
