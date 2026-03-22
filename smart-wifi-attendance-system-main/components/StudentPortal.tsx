import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { app } from './firebase'; 
import emailjs from '@emailjs/browser';
import { cameraService, CapturedFaceData } from '../services/cameraService';
import { Camera, X, Check } from 'lucide-react';

const db = getDatabase(app);

const StudentPortal = () => {
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'mismatch' | 'mobile_mismatch' | 'otp_pending' | 'ready' | 'submitted' | 'duplicate_submission' | 'device_locked' | 'checking_network' | 'unauthorized_network' | 'camera_capture' | 'camera_error'>('checking_network');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [alreadySubmittedError, setAlreadySubmittedError] = useState<string | null>(null);
const [isNetworkAuthorized, setIsNetworkAuthorized] = useState<boolean>(false);
  const [userIP, setUserIP] = useState<string | null>(null);

  // Camera-related state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedFace, setCapturedFace] = useState<CapturedFaceData | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const navigate = useNavigate();

  // EmailJS Credentials
  const ADMIN_EMAIL = 'dharunkumar0011@gmail.com';
  const SERVICE_ID = 'service_ov2ed0c';
  const TEMPLATE_ID = 'template_8l5je3k';
  const PUBLIC_KEY = 'lY_7i4-3Fv9oPY7Oi';

  // Allowed Networks - Local Network Gateway
  const LOCALHOST_HOSTNAMES = ['localhost', '127.0.0.1', '::1', 'smart-wifi-attendance-collage.vercel.app'];
  const ALLOWED_HOTSPOT_IPS = '192.168.137.1'; // Laptop's Mobile Hotspot IP

  // Fast Network Validation useEffect - NO EXTERNAL API CALLS
  React.useEffect(() => {
    const validateNetwork = () => {
      try {
        // Get hostname/IP from the URL
        const { hostname } = window.location;
        
        // Check 1: Is it localhost?
        if (LOCALHOST_HOSTNAMES.includes(hostname)) {
          setIsNetworkAuthorized(true);
          setStatus('idle');
          setUserIP('localhost');
          return;
        }

    // Vercel domain-ayum oru network-ah allow panna sollunga
if (hostname === ALLOWED_HOTSPOT_IPS || hostname === 'smart-wifi-attendance-collage.vercel.app') {
  setIsNetworkAuthorized(true);
  setStatus('idle');
  setUserIP(hostname);
  return;
}
        // Check 3: Not authorized - deny access
        setIsNetworkAuthorized(false);
        setStatus('unauthorized_network');
        setUserIP(hostname);
      } catch (error) {
        // If any error occurs, deny access for security
        console.error('Network validation error:', error);
        setIsNetworkAuthorized(false);
        setStatus('unauthorized_network');
        setUserIP('unknown');
      }
    };

    // Run immediately on component mount (synchronous, very fast)
    validateNetwork();
  }, []);

  // Device ID function (One device per mobile)
  const getDeviceId = React.useCallback(() => {
    let id = localStorage.getItem('attendance_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('attendance_device_id', id);
    }
    return id;
  }, []);

  const handleVerify = React.useCallback(async () => {
    if (!name || !regNo || !mobileNumber) return alert("Please fill Name, Reg Number, and Mobile Number");
    
    // Validate mobile number format (10 digits)
    if (!/^\d{10}$/.test(mobileNumber.replace(/\D/g, ''))) {
      return alert("Please enter a valid 10-digit mobile number");
    }

    setStatus('verifying');
    
    const formattedReg = regNo.toUpperCase().trim();
    const formattedMobile = mobileNumber.replace(/\D/g, ''); // Remove non-numeric characters
    const currentDeviceId = getDeviceId();

    try {
      // STRICT: Check if this device already has a DIFFERENT mobile number registered
      const deviceCheckRef = ref(db, `device_mobile/${currentDeviceId}`);
      const deviceCheckSnap = await get(deviceCheckRef);

      if (deviceCheckSnap.exists()) {
        const registeredMobile = deviceCheckSnap.val().mobileNumber;
        if (registeredMobile !== formattedMobile) {
          alert("❌ ERROR: This device can only be used with mobile number: " + registeredMobile + "\n\nOnly ONE mobile number per device is allowed.");
          setStatus('mobile_mismatch');
          return;
        }
      }

      // Check if mobile number is already registered to a different device
      const mobileCheckRef = ref(db, `mobile_devices/${formattedMobile}`);
      const mobileCheckSnap = await get(mobileCheckRef);

      if (mobileCheckSnap.exists()) {
        const mobileData = mobileCheckSnap.val();
        // If mobile is registered and device ID is different, block access
        if (mobileData.deviceId !== currentDeviceId) {
          alert("❌ ERROR: This mobile number is already registered on another device.\n\nContact admin to change device.");
          setStatus('mobile_mismatch');
          return;
        }
      }

      // Check student registration
      const studentRef = ref(db, `students/${formattedReg}`);
      const studentSnap = await get(studentRef);

      if (!studentSnap.exists()) {
        alert("FAILURE: Student not registered!");
        setStatus('idle');
        return;
      }

      const studentData = studentSnap.val();
      
      // Check if student has a different mobile number registered
      if (studentData.mobileNumber && studentData.mobileNumber !== formattedMobile) {
        alert("❌ ERROR: This student registration is linked to a different mobile number.\n\nPlease use the correct mobile number.");
        setStatus('idle');
        return;
      }

      // Device Binding Logic
      if (!studentData.deviceId) {
        // First time: Register both device and mobile number
        await update(studentRef, { 
          deviceId: currentDeviceId,
          mobileNumber: formattedMobile
        });
        // Also register in mobile_devices for quick lookup
        await set(mobileCheckRef, {
          regNo: formattedReg,
          deviceId: currentDeviceId,
          mobileNumber: formattedMobile,
          registeredAt: new Date().toISOString()
        });
        // Register device to mobile mapping
        await set(deviceCheckRef, {
          mobileNumber: formattedMobile,
          regNo: formattedReg,
          registeredAt: new Date().toISOString()
        });
        setStatus('ready');
      } else if (studentData.deviceId === currentDeviceId) {
        // Same device, same mobile - allow
        setStatus('ready');
      } else {
        // Device mismatch - trigger OTP flow
        setStatus('mismatch');
      }
    } catch (err) {
      alert("System Connection Error");
      console.error(err);
      setStatus('idle');
    }
  }, [name, regNo, mobileNumber, getDeviceId]);

  // Staff-ku OTP anupra function
  const sendOtpToAdmin = React.useCallback(async () => {
    setSendingOtp(true);
    
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      
      const formattedMobile = mobileNumber.replace(/\D/g, '');
      
      // Send email using the same pattern as App.tsx
      const response = await emailjs.send(
        SERVICE_ID, 
        TEMPLATE_ID, 
        {
          reg_no: regNo,
          mobile_number: formattedMobile,
          otp_code: otp,
          message: `DEVICE CHANGE REQUEST: Student ${name} (${regNo}) with mobile +91${formattedMobile} tried using another phone.`,
          student_name: name
        },
        PUBLIC_KEY
      );
      
      // Check if response indicates success
      if (response.status === 200) {
        alert("✅ OTP sent successfully! Check admin email.");
        setStatus('otp_pending');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`❌ Failed to send OTP: ${errorMessage}\n\nNote: Template must be configured in EmailJS dashboard with recipient: dharunkumar0011@gmail.com`);
      console.error('OTP Send Error:', error);
    } finally {
      setSendingOtp(false);
    }
  }, [name, regNo, mobileNumber, SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY]);

  const verifyOtp = React.useCallback(async () => {
    if (otpInput === generatedOtp) {
      const formattedReg = regNo.toUpperCase().trim();
      const formattedMobile = mobileNumber.replace(/\D/g, '');
      const currentDeviceId = getDeviceId();

      try {
        // Update student with new device ID
        await update(ref(db, `students/${formattedReg}`), { 
          deviceId: currentDeviceId,
          mobileNumber: formattedMobile
        });

        // Update mobile_devices entry with new device ID
        await set(ref(db, `mobile_devices/${formattedMobile}`), {
          regNo: formattedReg,
          deviceId: currentDeviceId,
          mobileNumber: formattedMobile,
          registeredAt: new Date().toISOString()
        });

        alert("✅ New Device Linked Successfully!");
        setStatus('ready');
      } catch (error) {
        alert("Failed to update device. Please try again.");
        console.error(error);
      }
    } else {
      alert("Invalid OTP!");
    }
  }, [otpInput, generatedOtp, regNo, mobileNumber, getDeviceId]);

  const [readyToActivate, setReadyToActivate] = React.useState(false);

  const startCamera = React.useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);
    setReadyToActivate(false);
    
    try {
      // Check camera support
      if (!cameraService.isCameraSupported()) {
        setCameraError('Camera is not supported on this device. Please use a device with a camera.');
        setCameraLoading(false);
        return;
      }

      console.log('Requesting camera permission...');
      // Request camera access FIRST
      const permission = await cameraService.requestCameraAccess();
      
      if (!permission.granted) {
        setCameraError(permission.error || 'Camera access denied');
        setCameraLoading(false);
        return;
      }

      console.log('✅ Permission granted, now activating camera UI...');
      // Set this flag to trigger the video element to be rendered
      setReadyToActivate(true);
      // Set active to render the video element in DOM
      setIsCameraActive(true);
      setCameraLoading(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize camera';
      console.error('Camera initialization error:', error);
      setCameraError(errorMsg);
      setCameraLoading(false);
    }
  }, []);

  // Initialize camera stream AFTER video element is rendered
  useEffect(() => {
    if (readyToActivate && isCameraActive && videoRef.current) {
      console.log('Initializing camera stream on video element...');
      cameraService.initializeCamera(videoRef.current);
      console.log('✅ Camera stream initialized successfully');
      setReadyToActivate(false);
    }
  }, [readyToActivate, isCameraActive]);

  const stopCameraStream = React.useCallback(() => {
    cameraService.stopCamera();
    setIsCameraActive(false);
    setShowCameraModal(false);
  }, []);

  const retakePhoto = React.useCallback(() => {
    setCapturedFace(null);
    setCameraError(null);
    startCamera();
  }, [startCamera]);

  const capturePhoto = React.useCallback(() => {
    try {
      const currentDeviceId = getDeviceId();
      const faceData = cameraService.captureFace(currentDeviceId);

      if (faceData) {
        setCapturedFace(faceData);
        // Automatically stop the camera after capturing
        cameraService.stopCamera();
        setIsCameraActive(false);
        console.log('✅ Face captured and camera closed. Ready to submit.');
        alert('✅ Face captured successfully! You can now SUBMIT ATTENDANCE on the right side.');
      } else {
        setCameraError('Failed to capture face. Please try again.');
      }
    } catch (error) {
      setCameraError('Error capturing face: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [getDeviceId]);

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      if (isCameraActive) {
        stopCameraStream();
      }
    };
  }, [isCameraActive, stopCameraStream]);

  const handleSubmitAttendance = React.useCallback(async () => {
    console.log('📤 Submit button clicked. capturedFace status:', !!capturedFace);
    if (!capturedFace) {
      console.log('❌ NO CAPTURED FACE - showing error');
      alert('⚠️ Please capture your face photo first!\n\nSteps:\n1. Click "OPEN CAMERA"\n2. Click "CAPTURE PHOTO"\n3. Then click "SUBMIT ATTENDANCE"');
      return;
    }

    // ===== STRICT ONE DEVICE, ONE SUBMISSION CHECK =====
    const deviceAlreadySubmitted = localStorage.getItem('attendance_completed');
    
    if (deviceAlreadySubmitted === 'true') {
      const errorMsg = '❌ This device has already submitted attendance today.';
      alert(errorMsg);
      return;
    }

    const today = new Date().toLocaleDateString();
    const formattedReg = regNo.toUpperCase().trim();
    const formattedMobile = mobileNumber.replace(/\D/g, '');

    try {
      // Check if already submitted today in Firebase
      const attendanceRef = ref(db, 'attendance');
      const attendanceSnap = await get(attendanceRef);
      const attendanceData = attendanceSnap.val() || {};

      const hasSubmittedToday = Object.values(attendanceData).some((record: any) =>
        record.regNo === formattedReg && record.date === today
      );

      if (hasSubmittedToday) {
        alert("❌ Attendance already submitted for today!");
        return;
      }

      // Submit attendance with verification timestamp
      const submissionData = {
        name,
        regNo: formattedReg,
        mobileNumber: formattedMobile,
        time: new Date().toLocaleTimeString(),
        date: today,
        deviceId: getDeviceId(),
        status: 'Verified',
        faceVerified: true,
        cameraTimestamp: capturedFace.timestamp
      };

      await set(ref(db, `attendance/${Date.now()}`), submissionData);
      localStorage.setItem('attendance_completed', 'true');
      
      alert("✅ Submitted Successfully");
      console.log('✅ Attendance submitted successfully');
      
      // Reset form
      setTimeout(() => {
        setName('');
        setRegNo('');
        setMobileNumber('');
        setCapturedFace(null);
        setStatus('idle');
      }, 500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Submission error:', err);
      alert(`Submission failed: ${errorMsg}`);
    }
  }, [name, regNo, mobileNumber, getDeviceId, capturedFace]);

  // Update time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2342] via-[#05050a] to-[#1a0033] text-white p-4 sm:p-6 font-sans">
      <h1 className="text-center text-2xl font-bold text-[#00d1ff] mb-8 tracking-widest">STUDENT PORTAL</h1>
      
      {/* NETWORK AUTHORIZATION CHECK */}
      {status === 'unauthorized_network' && (
        <div className="min-h-screen w-full flex items-center justify-center fixed inset-0 bg-gradient-to-br from-[#0a2342] via-[#05050a] to-[#1a0033] z-50">
          <div className="text-center px-6">
            {/* Large Red Stamp Effect */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-red-600 opacity-10 blur-3xl rounded-full"></div>
              <div className="relative inline-block">
                <div className="border-4 border-red-600 px-12 py-8 rounded-2xl transform -rotate-3">
                  <h2 className="text-7xl font-black text-red-600 tracking-widest drop-shadow-2xl" style={{
                    textShadow: '0 4px 15px rgba(220, 38, 38, 0.5), 0 0 30px rgba(220, 38, 38, 0.3)',
                    letterSpacing: '0.15em'
                  }}>
                    ACCESS
                  </h2>
                  <h2 className="text-7xl font-black text-red-600 tracking-widest drop-shadow-2xl" style={{
                    textShadow: '0 4px 15px rgba(220, 38, 38, 0.5), 0 0 30px rgba(220, 38, 38, 0.3)',
                    letterSpacing: '0.15em'
                  }}>
                    DENIED
                  </h2>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-6 max-w-2xl">
              <div className="bg-red-600/20 border-2 border-red-500 rounded-2xl p-8 backdrop-blur-md">
                <p className="text-red-300 text-2xl font-bold mb-4">
                  🚫 Unauthorized Network Detected
                </p>
                <p className="text-red-200 text-lg mb-4">
                  This portal can only be accessed from the authorized network.
                </p>
                <div className="border-t border-red-500/30 pt-6 mt-6">
                  <p className="text-amber-300 font-semibold text-lg mb-3">
                    ⚠️ To Access This Portal:
                  </p>
                  <p className="text-white text-xl font-bold mb-2">
                    Connect to: <span className="text-[#00d1ff]">KNCET Official Hotspot</span>
                  </p>
                  <p className="text-gray-300 text-sm mt-4">
                    Your IP: <span className="font-mono text-red-400">{userIP || 'Detecting...'}</span>
                  </p>
                </div>
              </div>

              <div className="bg-black/40 border border-red-500/20 rounded-xl p-6">
                <p className="text-gray-400 text-sm">
                  Contact your administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN PORTAL - Only visible if network is authorized */}
      {isNetworkAuthorized && status !== 'unauthorized_network' && (
      <div className="max-w-7xl mx-auto">
        {/* Two Column Layout: Camera (LEFT) + Form (RIGHT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* CAMERA SECTION - LEFT SIDE */}
          <div className="bg-gradient-to-b from-[#00d1ff]/10 to-transparent p-6 sm:p-8 rounded-3xl border border-[#00d1ff]/30 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <Camera size={24} className="text-[#00d1ff]" />
              <h2 className="text-[#00d1ff] font-bold text-lg">PHOTO VERIFICATION</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              {isCameraActive ? 'Position your face and capture' : 'Camera inactive - click below to request permission and start.'}
            </p>
            
            {/* Camera Preview or Camera Icon */}
            <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-[#00d1ff]/50 mb-6 aspect-video flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-56 border-4 border-[#00d1ff]/50 rounded-2xl"></div>
                  </div>
                </>
              ) : capturedFace ? (
                <img 
                  src={capturedFace.base64} 
                  alt="Captured face" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <Camera size={64} className="text-[#00d1ff]/50 mx-auto mb-4" />
                  <p className="text-gray-500">Camera inactive</p>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            {!isCameraActive && !capturedFace && !cameraError && (
              <button
                onClick={startCamera}
                disabled={cameraLoading}
                className="w-full min-h-[48px] py-3 bg-[#00d1ff] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-all flex items-center justify-center gap-2"
              >
                {cameraLoading ? '⏳ INITIALIZING...' : '📷 OPEN CAMERA'}
              </button>
            )}

            {isCameraActive && !capturedFace && (
              <div className="space-y-2">
                <button
                  onClick={capturePhoto}
                  className="w-full min-h-[48px] py-3 bg-[#00ffa3] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,255,163,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  CAPTURE PHOTO
                </button>
                <button
                  onClick={stopCameraStream}
                  className="w-full min-h-[48px] py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all"
                >
                  CLOSE CAMERA
                </button>
              </div>
            )}

            {capturedFace && (
              <div className="space-y-2">
                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-xl">
                  <p className="text-green-300 text-sm font-semibold">✅ Photo captured successfully!</p>
                </div>
                <button
                  onClick={retakePhoto}
                  className="w-full min-h-[48px] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
                >
                  RETAKE PHOTO
                </button>
              </div>
            )}

            {cameraError && (
              <div className="space-y-2">
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
                  <p className="text-red-400 text-sm font-semibold mb-1">❌ Camera Error</p>
                  <p className="text-red-300 text-xs">{cameraError}</p>
                </div>
                <button
                  onClick={() => {
                    setCameraError(null);
                    startCamera();
                  }}
                  className="w-full min-h-[48px] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
                >
                  TRY AGAIN
                </button>
              </div>
            )}
          </div>

          {/* FORM SECTION - RIGHT SIDE */}
          <div className="bg-white/5 p-6 sm:p-8 rounded-3xl border border-white/10 backdrop-blur-md">
            <h2 className="text-[#00d1ff] mb-6 font-bold text-lg">📋 ATTENDANCE DETAILS</h2>
            
            {/* Name Field */}
            <div className="mb-6">
              <label className="text-gray-400 text-sm font-semibold mb-2 block">YOUR FULL NAME</label>
              <input 
                type="text" 
                placeholder="e.g., John Doe" 
                className="w-full bg-black/50 border border-white/10 p-4 rounded-xl focus:border-[#00d1ff] focus:shadow-[0_0_15px_rgba(0,209,255,0.3)] outline-none transition-all"
                value={name} 
                onChange={(e) => setName(e.target.value)}
                disabled={status !== 'idle' && status !== 'ready'}
              />
            </div>

            {/* Registration Number Field */}
            <div className="mb-6">
              <label className="text-gray-400 text-sm font-semibold mb-2 block">REGISTRATION NUMBER</label>
              <input 
                type="text" 
                placeholder="e.g., KNC001" 
                className="w-full bg-black/50 border border-white/10 p-4 rounded-xl focus:border-[#00d1ff] focus:shadow-[0_0_15px_rgba(0,209,255,0.3)] outline-none transition-all"
                value={regNo} 
                onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                disabled={status !== 'idle' && status !== 'ready'}
              />
            </div>

            {/* Mobile Number Field */}
            <div className="mb-6">
              <label className="text-gray-400 text-sm font-semibold mb-2 block">MOBILE NUMBER</label>
              <input 
                type="tel" 
                placeholder="e.g., 98765 43216" 
                className="w-full bg-black/50 border border-white/10 p-4 rounded-xl focus:border-[#00d1ff] focus:shadow-[0_0_15px_rgba(0,209,255,0.3)] outline-none transition-all"
                value={mobileNumber} 
                onChange={(e) => setMobileNumber(e.target.value)}
                disabled={status !== 'idle' && status !== 'ready'}
                maxLength="15"
              />
              <p className="text-gray-500 text-xs mt-1">⚠️ This mobile number can only be used on one device</p>
            </div>
            
            <div className="mb-6 bg-black/30 p-4 rounded-xl border border-[#00d1ff]/20">
              <label className="text-gray-400 text-sm font-semibold mb-2 block">SUBMISSION TIME</label>
              <div className="text-[#00d1ff] text-xl font-mono font-bold">
                {currentTime}
              </div>
            </div>

            {/* Status-based Buttons */}
            {status === 'idle' && (
              <button
                onClick={handleVerify}
                className="w-full min-h-[48px] py-3 bg-[#00d1ff] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-all"
              >
                ✓ VERIFY & PROCEED
              </button>
            )}

            {status === 'ready' && (
              <button 
                onClick={handleSubmitAttendance}
                disabled={!capturedFace}
                className={`w-full min-h-[48px] py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  capturedFace
                    ? 'bg-[#00ffa3] text-black hover:shadow-[0_0_20px_rgba(0,255,163,0.4)]'
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
                }`}
                title={!capturedFace ? 'Capture your face photo first' : 'Click to submit attendance'}
              >
                {capturedFace ? '🚀 SUBMIT ATTENDANCE' : '📷 CAPTURE PHOTO FIRST'}
              </button>
            )}

            {status === 'mismatch' && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                  <p className="text-red-400 font-semibold">⚠️ Device Mismatch!</p>
                  <p className="text-red-300 text-sm mt-1">Use your registered mobile device.</p>
                </div>
                <button 
                  onClick={sendOtpToAdmin}
                  disabled={sendingOtp}
                  className={`w-full min-h-[48px] py-3 font-bold rounded-xl transition-all ${
                    sendingOtp
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-70'
                      : 'bg-amber-500 text-black hover:bg-amber-600'
                  }`}
                >
                  {sendingOtp ? '⏳ SENDING OTP...' : '📧 REQUEST DEVICE CHANGE'}
                </button>
              </div>
            )}

            {status === 'mobile_mismatch' && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                  <p className="text-red-400 font-semibold">❌ Mobile Number Already Registered!</p>
                  <p className="text-red-300 text-sm mt-2">
                    This mobile number (<span className="font-mono font-bold">{mobileNumber.slice(-2)}</span>) is already linked to another device.
                  </p>
                  <p className="text-red-300 text-sm mt-2">
                    Each mobile number can only be used on ONE device. To use a different mobile device, please contact the admin with your registration number.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setStatus('idle');
                    setMobileNumber('');
                  }}
                  className="w-full min-h-[48px] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
                >
                  🔄 TRY AGAIN WITH DIFFERENT MOBILE
                </button>
              </div>
            )}

            {status === 'otp_pending' && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                  <p className="text-amber-300 font-semibold">⏳ OTP Sent to Admin</p>
                  <p className="text-amber-200 text-sm mt-1">Check admin email for verification code</p>
                </div>
                <input 
                  type="text" 
                  placeholder="Enter OTP from Admin" 
                  className="w-full bg-black/50 border border-amber-500/50 p-4 rounded-xl focus:border-amber-400 outline-none"
                  value={otpInput} 
                  onChange={(e) => setOtpInput(e.target.value)}
                />
                <button
                  onClick={verifyOtp}
                  className="w-full min-h-[48px] py-3 bg-[#00ffa3] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,255,163,0.4)]"
                >
                  ✓ UNLOCK DEVICE
                </button>
              </div>
            )}

            {status === 'device_locked' && (
              <div className="space-y-4">
                <div className="bg-red-600/20 border border-red-500/50 p-4 rounded-xl">
                  <p className="text-red-300 font-bold text-lg">🔒 DEVICE LOCKED</p>
                  <p className="text-red-300 text-sm mt-3">
                    <span className="font-semibold">Access Denied:</span> You have already submitted attendance from this device.
                  </p>
                  <p className="text-red-300 text-sm mt-3">
                    <span className="font-semibold">Rule: One Device = One Submission</span>
                  </p>
                  <p className="text-red-300 text-sm mt-3">
                    This device cannot submit attendance again. Each device can only mark attendance once and permanently.
                  </p>
                  <p className="text-red-400 text-sm mt-3 font-semibold">
                    📞 To submit from a different device, contact your admin with your registration number.
                  </p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                  <p className="text-red-300 text-xs">
                    <span className="font-semibold">Device Fingerprint:</span> {getDeviceId()}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setStatus('idle');
                    setAlreadySubmittedError(null);
                    setName('');
                    setRegNo('');
                    setMobileNumber('');
                  }}
                  className="w-full min-h-[48px] py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-700 transition-all"
                >
                  ↩️ BACK TO HOME
                </button>
              </div>
            )}

            {status === 'duplicate_submission' && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                  <p className="text-red-400 font-semibold">❌ Attendance Already Submitted!</p>
                  <p className="text-red-300 text-sm mt-2">
                    This device has already submitted attendance today. One Mobile = One Attendance per day.
                  </p>
                  <p className="text-red-300 text-sm mt-2">
                    To submit attendance from a different device, please contact the admin with your registration number.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setStatus('idle');
                      setSubmissionError(null);
                      setName('');
                      setRegNo('');
                      setMobileNumber('');
                    }}
                    className="w-full min-h-[48px] py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-700 transition-all"
                  >
                    🔄 START OVER
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('attendance_submitted');
                      setStatus('idle');
                      setSubmissionError(null);
                      setName('');
                      setRegNo('');
                      setMobileNumber('');
                      alert("⚠️ Submission flag cleared. Please use this responsibly.");
                    }}
                    className="w-full min-h-[48px] py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all"
                  >
                    🔐 CLEAR & RETRY
                  </button>
                </div>
                <p className="text-gray-400 text-xs text-center mt-2">
                  Contact admin if you need to submit from a different device.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Guidelines Section */}
        <div className="bg-white/5 p-6 sm:p-8 rounded-3xl border border-white/10 backdrop-blur-md">
          <h3 className="text-[#00d1ff] font-bold text-lg mb-4">📌 IMPORTANT GUIDELINES</h3>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span>Use the same device registered during enrollment</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span><span className="font-semibold text-red-400">⚠️ ONE DEVICE = ONE SUBMISSION (PERMANENT)</span>. Each device can submit attendance ONLY ONCE. Once submitted, this device is locked and cannot submit again.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span><span className="font-semibold text-red-400">DO NOT share this device with other students</span>. This rule prevents one student from marking attendance for multiple registration numbers.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span><span className="font-semibold text-red-400">Each mobile number can only be used on ONE device</span>. Attempting to use the same mobile number on a different device will be blocked.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span>Once your submission is locked, <span className="font-semibold">contact admin with your registration number</span> if you need to submit from a different device.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span>Your attendance data is encrypted and secure</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span><span className="font-semibold text-[#ff6b35]">📸 FACE CAPTURE</span>: Use the <span className="text-[#00d1ff]">PHOTO VERIFICATION section on the LEFT</span> side. Click <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded">OPEN CAMERA</span>, position your face in the guide, click <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded">CAPTURE PHOTO</span>, then click <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded">SUBMIT ATTENDANCE</span> on the right. Ensure good lighting and face visibility.</span>
            </li>
          </ul>
        </div>


      </div>
      )}
    </div>
  );
};

export default StudentPortal;