# 🎓 Smart WiFi Attendance System

A futuristic, AI-powered attendance tracking system built with React, Vite, and Tailwind CSS. Features real-time Firebase integration, automated email alerts, and comprehensive analytics.

## ✨ Features

### 📊 Dashboard
- **Doughnut Chart Analytics** - Visual representation of Present vs Absent ratio
- **Real-time Statistics** - Total students, present today, absent today, and attendance percentage
- **Attendance Rate** - Dynamic percentage calculation
- **Email Alert Management** - Send bulk absence notifications to parents

### 👥 Live Attendance Feed
- **Student Cards** - Display student name, registration number, and check-in time
- **Profile Photos** - Verification photos with modal popup viewer
- **Photo Download** - Download attendance verification images
- **Status Indicators** - Color-coded present/absent status

### ➕ Student Registration
- **Quick Registration** - Add new students with name and registration number
- **Parent Email Integration** - Store parent contact for alert notifications
- **Real-time Sync** - Instant Firebase database updates

### 📋 Automated Absentee List
- **Auto-Generated** - Cross-reference master database with daily attendance
- **Missing Students** - Automatically identifies no-show attendees
- **Email Ready** - One-click parent notification system

### 📧 Email Alert System (EmailJS)
- **Bulk Notifications** - Send absence alerts to multiple parents simultaneously
- **Customizable Templates** - Configure EmailJS templates for your needs
- **Status Tracking** - Real-time feedback on sent/failed emails
- **Error Handling** - Graceful error management and retry logic

### 📥 Excel Export
- **Comprehensive Reports** - Export full attendance data with formatting
- **Summary Reports** - Quick overview of daily statistics
- **CSV Export** - Alternative format support
- **Styled Sheets** - Professional formatting with colors and layouts
- **Analytics Export** - Detailed student and daily performance metrics

### 🎨 UI/UX
- **Dark Theme** - Modern dark interface reducing eye strain
- **Neon Glow Effects** - Futuristic pink (#FF007A) and cyan (#00D1FF) neon aesthetics
- **Responsive Design** - Optimized for desktop and tablet views
- **Smooth Animations** - Fade-in and scale effects for smooth transitions
- **Glassmorphism** - Frosted glass effect with backdrop blur

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Firebase project with Realtime Database
- EmailJS account (optional, for email alerts)

### Installation

```bash
# Clone or extract the project
cd smart-wi-fi-attendance-system

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5174`

## ⚙️ Configuration

### Firebase Setup

Replace the Firebase config in `App.tsx` with your credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
};
```

**Firebase Database Structure:**
```
students/
  ├── REG_NO_1
  │   ├── name: "Student Name"
  │   └── parentEmail: "parent@email.com"
  └── REG_NO_2
      ├── name: "Another Student"
      └── parentEmail: "another@email.com"

attendance/
  ├── record_1
  │   ├── name: "Student Name"
  │   ├── regNo: "REG_NO_1"
  │   ├── face: "image_url"
  │   └── time: "HH:MM:SS"
  └── record_2
      ├── name: "Another Student"
      ├── regNo: "REG_NO_2"
      ├── face: "image_url"
      └── time: "HH:MM:SS"
```

### EmailJS Configuration

1. **Sign up at [EmailJS.com](https://www.emailjs.com/)**

2. **Create an Email Service:**
   - Go to Email Services
   - Add Gmail or your email provider
   - Note the `SERVICE_ID`

3. **Create an Email Template:**
   ```html
   <h2>Hello {{parent_name}},</h2>
   
   <p>We notice that <strong>{{student_name}}</strong> ({{registration_number}}) 
   was absent on {{attendance_date}}.</p>
   
   <p>Please contact the administration for more information.</p>
   
   <p>Best regards,<br>School Administration</p>
   ```
   - Note the `TEMPLATE_ID`

4. **Update Service Configuration:**
   
   Open `services/emailService.ts` and update:
   ```typescript
   const SERVICE_ID = 'your_emailjs_service_id';
   const TEMPLATE_ID = 'your_emailjs_template_id';
   const PUBLIC_KEY = 'your_emailjs_public_key';
   ```

## 📱 Usage

### Dashboard Tab
- View attendance statistics
- Monitor student attendance rate
- See real-time present/absent counts
- Access email alert and export options

### Attendance Feed Tab
- Browse all present students
- View student photos (click "VIEW PHOTO" button)
- See absent students separately
- Download verification images

### Register Student Tab
- Enter student name
- Enter registration number
- Add parent email (optional but recommended)
- Submit to add to database

### Reports Tab
- Export attendance data to Excel
- Export to CSV format
- View summary statistics
- Track attendance trends

## 🎯 Key Functions

### `emailService.ts`
- `sendAbsenceAlert()` - Send single absence notification
- `sendBulkAbsenceAlerts()` - Send multiple notifications
- `verifyConfiguration()` - Check if EmailJS is configured
- `updateConfig()` - Update EmailJS credentials

### `excelService.ts`
- `exportAttendanceToExcel()` - Full attendance report
- `exportAttendanceSummary()` - Daily summary
- `importAttendanceFromExcel()` - Import data from file
- `generateAnalyticsReport()` - Detailed analytics

### `PhotoModal.tsx`
- `isOpen` - Control modal visibility
- `photoUrl` - Display student photo
- `onClose` - Handle modal close
- Download photo functionality

## 🎨 Customization

### Color Scheme
Modify colors in `App.tsx` and components:
- **Neon Pink**: `#ff007a` (Primary)
- **Cyan**: `#00d1ff` (Secondary)
- **Green**: `#00ffa3` (Success)
- **Red**: `#ff0055` (Error)

### Tailwind CSS
All styling uses Tailwind CSS utility classes. Customize in `tailwind.config.js` if present.

### Component Styling
- Dark background: `#05050a`
- Glass effect: `backdrop-blur-xl` with `bg-white/5`
- Glow effects: `shadow-[0_0_30px_color]`

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Build output is in the `dist/` directory.

## 🔧 Troubleshooting

### EmailJS Not Working
- Verify SERVICE_ID, TEMPLATE_ID, and PUBLIC_KEY
- Check EmailJS account is active
- Ensure parent emails in database are valid
- Check browser console for errors

### Photos Not Displaying
- Ensure image URLs in attendance records are valid
- Check CORS policies if using external image hosting
- Verify Firebase Storage rules if using Firebase Images

### Excel Export Issues
- Check browser's local storage isn't full
- Ensure popup blockers aren't preventing downloads
- Verify xlsx library is properly installed

### Firebase Connection Issues
- Verify internet connectivity
- Check Firebase database URL is correct
- Confirm Firebase rules allow read/write access
- Check authentication is properly configured

## 📊 Data Analytics

The system provides real-time analytics:
- Daily attendance percentage
- Student-wise attendance rates
- Trend analysis over time
- Absence patterns
- Peak attendance times

## 🔐 Security Considerations

- Never commit Firebase credentials to version control
- Use environment variables for sensitive data
- Enable Firebase security rules
- Validate email addresses before storing
- Implement user authentication (future enhancement)

## 🚀 Future Enhancements

- [ ] QR code scanning for attendance
- [ ] Biometric verification
- [ ] Mobile app version
- [ ] Advanced analytics dashboard
- [ ] Attendance app for students
- [ ] SMS notifications
- [ ] Admin authentication
- [ ] Historical attendance reports
- [ ] Performance metrics
- [ ] Parent app integration

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase documentation
3. Check EmailJS setup guide
4. Review component source code

## 📄 License

This project is provided as-is for educational and institutional use.

## 🎓 Technology Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **Database**: Firebase Realtime Database
- **Charts**: Chart.js, react-chartjs-2
- **Email**: EmailJS
- **Excel**: xlsx
- **Icons**: Lucide React
- **Webcam**: react-webcam (ready for camera integration)

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Status**: Production Ready ✅
