import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { app } from './firebase';
import emailjs from '@emailjs/browser';
import { cameraService, CapturedFaceData } from '../services/cameraService';
import { getStoredDeviceFingerprint } from '../utils/deviceFingerprint';
import { Camera, X, Check, Shield, AlertTriangle } from 'lucide-react';

const db = getDatabase(app);

const StudentPortal = () => {
  const [isNetworkAuthorized, setIsNetworkAuthorized] = useState(false);
  const [accessStatus, setAccessStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'ready' | 'submitted' | 'camera_capture' | 'camera_error'>('idle');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [alreadySubmittedError, setAlreadySubmittedError] = useState<string | null>(null);

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

  // ===== DEVICE-REGISTER NUMBER BINDING SECURITY =====
  useEffect(() => {
    checkDeviceAccess();
  }, []);

  const checkDeviceAccess = async () => {
    try {
      console.log('🔒 Checking device access...');
      const currentDeviceId = await getStoredDeviceFingerprint();
      console.log('Current Device ID:', currentDeviceId);

      // Get all attendance records to check device bindings
      const attendanceRef = ref(db, 'attendance');
      const attendanceSnap = await get(attendanceRef);
      const attendanceData = attendanceSnap.val() || {};

      // Check if this device has been used before with any register number
      const deviceRecords = Object.values(attendanceData).filter((record: any) =>
        record.deviceId === currentDeviceId
      ) as any[];

      if (deviceRecords.length > 0) {
        // This device has been used before - check if it's trying to use a different register number
        const previousRegNo = deviceRecords[0].regNo;
        console.log(`📱 Device ${currentDeviceId} previously used with register number: ${previousRegNo}`);

        // For now, allow access but we'll validate during submission
        // The binding check will happen when they try to submit
        setAccessStatus('granted');
        setIsNetworkAuthorized(true);
      } else {
        // First time device - allow access
        console.log(`🆕 New device ${currentDeviceId} - granting access`);
        setAccessStatus('granted');
        setIsNetworkAuthorized(true);
      }

      setStatus('idle');
    } catch (error) {
      console.error('❌ Device access check failed:', error);
      setAccessStatus('denied');
      setAccessError('Failed to verify device access. Please try refreshing the page.');
    }
  };

  const handleVerify = React.useCallback(async () => {
    if (!name || !regNo || !mobileNumber) return alert("Please fill Name, Reg Number, and Mobile Number");

    try {
      console.log('🔍 Verifying register number and device binding...');
      const currentDeviceId = await getStoredDeviceFingerprint();
      const formattedReg = regNo.toUpperCase().trim();
      const formattedMobile = mobileNumber.replace(/\D/g, '');

      // Get all attendance records to check bindings
      const attendanceRef = ref(db, 'attendance');
      const attendanceSnap = await get(attendanceRef);
      const attendanceData = attendanceSnap.val() || {};

      // ===== STRICT DEVICE-REGISTER NUMBER BINDING =====
      // RULE 1: One register number = One device (permanent binding on first use)
      const regNoRecords = Object.values(attendanceData).filter((record: any) =>
        record.regNo === formattedReg
      ) as any[];

      if (regNoRecords.length > 0) {
        // Register number has been used before - check device binding
        const boundDeviceId = regNoRecords[0].deviceId;

        if (boundDeviceId && boundDeviceId !== currentDeviceId) {
          console.error(`❌ REGISTER NUMBER BINDING VIOLATION: ${formattedReg} is permanently bound to device ${boundDeviceId}, but device ${currentDeviceId} tried to use it`);
          setAccessStatus('denied');
          setAccessError(`❌ ACCESS DENIED!\n\nRegister Number: ${formattedReg}\nPermanently Bound To: Device ${boundDeviceId.substring(0, 8)}...\n\n⚠️ This register number can ONLY be used on its originally registered device.\n\n📱 DEVICE CHANGE NEEDED? Contact your administrator to reset the device binding.\n\nProvide your register number to get help.`);
          return;
        }
        console.log(`✅ Register number ${formattedReg} is allowed on this device`);
      }

      // RULE 2: One device = One register number
      const deviceRecords = Object.values(attendanceData).filter((record: any) =>
        record.deviceId === currentDeviceId
      ) as any[];

      if (deviceRecords.length > 0) {
        // This device has been used before - check if it's trying to use a different register number
        const previousRegNo = deviceRecords[0].regNo;

        if (previousRegNo !== formattedReg) {
          console.error(`❌ DEVICE BINDING VIOLATION: Device ${currentDeviceId} is permanently bound to ${previousRegNo}, but tried to use ${formattedReg}`);
          setAccessStatus('denied');
          setAccessError(`❌ ACCESS DENIED!\n\nThis Device is Permanently Bound To: ${previousRegNo}\n\n⚠️ Each device can only be used with ONE register number.\n\nYou are trying to use it with: ${formattedReg}\n\n📱 NEED TO USE DIFFERENT REGISTER NUMBER? Contact your administrator to reset this device's binding.\n\nProvide your register number to get help.`);
          return;
        }
        console.log(`✅ Device ${currentDeviceId} is allowed to use ${formattedReg}`);
      }

      // ===== MOBILE NUMBER BINDING (existing logic) =====
      const previousMobileRecord = Object.values(attendanceData).find((record: any) =>
        record.mobileNumber === formattedMobile
      );

      if (previousMobileRecord) {
        const previousRegNo = (previousMobileRecord as any).regNo;
        const previousDeviceId = (previousMobileRecord as any).deviceId;

        // RULE: One mobile = One student permanently
        if (previousRegNo !== formattedReg) {
          console.error(`❌ MOBILE BINDING VIOLATION: Mobile ${formattedMobile} is locked to ${previousRegNo}, but ${formattedReg} tried to use it`);
          setAccessStatus('denied');
          setAccessError(`❌ ACCESS DENIED!\n\nMobile: ${formattedMobile}\nPermanently Linked To: ${previousRegNo}\n\n⚠️ You are trying to use it with: ${formattedReg}\n\nThis mobile number can ONLY be used by registration ${previousRegNo} forever.\n\nPlease use a different mobile number or contact admin.`);
          return;
        }

        // RULE 2: One mobile = One device
        if (previousDeviceId && previousDeviceId !== currentDeviceId) {
          console.error(`❌ DEVICE BINDING VIOLATION: Mobile ${formattedMobile} was used on device ${previousDeviceId}, but device ${currentDeviceId} tried to use it`);
          setAccessStatus('denied');
          setAccessError("❌ ACCESS DENIED!\n\n⚠️ This mobile number is already registered on a DIFFERENT PHONE!\n\nONE MOBILE NUMBER = ONE PHONE ONLY\n\nYou cannot use the same mobile number on multiple phones.\n\n📱 LOST YOUR PHONE? Contact your administrator to reset your device binding.\n\nProvide your register number to get help.");
          return;
        }

        console.log(`✅ Mobile ${formattedMobile} is allowed (same reg ${previousRegNo} and device ${currentDeviceId})`);
      } else {
        console.log(`✅ Mobile ${formattedMobile} is new - will be locked to ${formattedReg}`);
      }

      // All checks passed - grant access
      setAccessStatus('granted');
      setStatus('ready');
      console.log(`✅ All security checks passed for ${formattedReg} on device ${currentDeviceId}`);

    } catch (error) {
      console.error('❌ Verification error:', error);
      alert(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [name, regNo, mobileNumber]);

  // OTP/admin device change logic removed

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
      // Device ID logic removed
      const faceData = cameraService.captureFace("");

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
  }, []);

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
    console.log('Form Details - Name:', name, 'RegNo:', regNo, 'Mobile:', mobileNumber);

    if (!capturedFace) {
      console.log('❌ NO CAPTURED FACE - showing error');
      alert('⚠️ Please capture your face photo first!\n\nSteps:\n1. Click "OPEN CAMERA"\n2. Click "CAPTURE PHOTO"\n3. Then click "SUBMIT ATTENDANCE"');
      return;
    }

    const today = new Date().toLocaleDateString();
    const formattedReg = regNo.toUpperCase().trim();
    const formattedMobile = mobileNumber.replace(/\D/g, '');

    console.log(`Trying to submit - Reg: ${formattedReg}, Mobile: ${formattedMobile}, Date: ${today}`);

    try {
      // Get current device fingerprint
      const currentDeviceId = await getStoredDeviceFingerprint();
      console.log('Current Device ID:', currentDeviceId);

      // Check if already submitted today in Firebase
      const attendanceRef = ref(db, 'attendance');
      const attendanceSnap = await get(attendanceRef);
      const attendanceData = attendanceSnap.val() || {};

      console.log('All attendance records in database:', Object.keys(attendanceData).length, 'records');

      const hasSubmittedToday = Object.values(attendanceData).some((record: any) =>
        record.regNo === formattedReg && record.date === today
      );

      if (hasSubmittedToday) {
        console.log(`❌ ${formattedReg} already submitted today`);
        alert("❌ Attendance already submitted for today!");
        return;
      }

      // ===== FINAL SECURITY VALIDATION =====
      // Double-check all bindings before submission (belt and suspenders approach)

      // 1. Check register number binding
      const regNoRecords = Object.values(attendanceData).filter((record: any) =>
        record.regNo === formattedReg
      ) as any[];

      if (regNoRecords.length > 0) {
        const boundDeviceId = regNoRecords[0].deviceId;
        if (boundDeviceId && boundDeviceId !== currentDeviceId) {
          console.error(`❌ SUBMISSION BLOCKED: Register number binding violation`);
          alert("❌ SECURITY VIOLATION DETECTED!\n\nThis register number is bound to a different device.");
          return;
        }
      }

      // 2. Check device binding
      const deviceRecords = Object.values(attendanceData).filter((record: any) =>
        record.deviceId === currentDeviceId
      ) as any[];

      if (deviceRecords.length > 0) {
        const previousRegNo = deviceRecords[0].regNo;
        if (previousRegNo !== formattedReg) {
          console.error(`❌ SUBMISSION BLOCKED: Device binding violation`);
          alert("❌ SECURITY VIOLATION DETECTED!\n\nThis device is bound to a different register number.");
          return;
        }
      }

      // 3. Check mobile binding (existing logic)
      const previousMobileRecord = Object.values(attendanceData).find((record: any) =>
        record.mobileNumber === formattedMobile
      );

      if (previousMobileRecord) {
        const previousRegNo = (previousMobileRecord as any).regNo;
        const previousDeviceId = (previousMobileRecord as any).deviceId;

        if (previousRegNo !== formattedReg) {
          console.error(`❌ SUBMISSION BLOCKED: Mobile binding violation`);
          alert("❌ SECURITY VIOLATION DETECTED!\n\nThis mobile number is bound to a different register number.");
          return;
        }

        if (previousDeviceId && previousDeviceId !== currentDeviceId) {
          console.error(`❌ SUBMISSION BLOCKED: Mobile-device binding violation`);
          alert("❌ SECURITY VIOLATION DETECTED!\n\nThis mobile number is registered on a different device.");
          return;
        }
      }

      // Submit attendance with PERMANENT device binding
      const submissionData = {
        name,
        regNo: formattedReg,
        mobileNumber: formattedMobile,
        time: new Date().toLocaleTimeString(),
        date: today,
        deviceId: currentDeviceId, // PERMANENT DEVICE BINDING
        status: 'Verified',
        faceVerified: true,
        cameraTimestamp: capturedFace.timestamp,
        photo: capturedFace.base64, // SAVE THE FACE PHOTO (base64)
        // Additional security metadata
        bindingTimestamp: new Date().toISOString(),
        deviceFingerprint: currentDeviceId
      };

      console.log(`📝 Submitting attendance with permanent device binding:`, submissionData);
      await set(ref(db, `attendance/${Date.now()}`), submissionData);
      console.log(`✅ Data saved to Firebase with device binding`);
      localStorage.setItem('attendance_completed', 'true');

      alert("✅ Submitted Successfully!\n\n⚠️ IMPORTANT: This device is now PERMANENTLY bound to register number " + formattedReg + "\n\nYou cannot use this device with any other register number.");
      console.log('✅ Attendance submitted successfully - Form will reset in 0.5 seconds');

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
  }, [name, regNo, mobileNumber, capturedFace]);

  // Update time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show access denied screen if access is denied
  if (accessStatus === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 text-white p-4 sm:p-6 font-sans flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-500/10 border-2 border-red-500/50 p-8 rounded-3xl backdrop-blur-md">
            <div className="flex justify-center mb-6">
              <div className="bg-red-500/20 p-4 rounded-full">
                <Shield size={64} className="text-red-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-red-400 mb-4 tracking-widest">ACCESS DENIED</h1>
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl mb-6">
              <AlertTriangle size={32} className="text-red-300 mx-auto mb-4" />
              <p className="text-red-200 text-lg font-semibold mb-4">Security Violation Detected</p>
              <div className="text-red-100 text-left whitespace-pre-line font-mono text-sm bg-black/30 p-4 rounded-xl">
                {accessError}
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-red-200 text-sm">
                If you believe this is an error, please contact your administrator with your register number.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full max-w-xs mx-auto py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                <X size={20} />
                CLOSE PORTAL
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen while checking access
  if (accessStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a2342] via-[#05050a] to-[#1a0033] text-white p-4 sm:p-6 font-sans flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white/5 border border-[#00d1ff]/30 p-8 rounded-3xl backdrop-blur-md">
            <div className="animate-spin w-12 h-12 border-4 border-[#00d1ff] border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-[#00d1ff] font-bold text-lg mb-2">Verifying Device Access</h2>
            <p className="text-gray-400 text-sm">Checking device binding and security permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2342] via-[#05050a] to-[#1a0033] text-white p-4 sm:p-6 font-sans">
      <div style={{background: '#1a1a2e', border: '2px solid #00d1ff', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', textAlign: 'center'}}>
        <p style={{color: '#00d1ff', fontWeight: 'bold', margin: 0}}>✅ Portal is Open | Face Verification Required | Device Security Active</p>
      </div>
      <h1 className="text-center text-2xl font-bold text-[#00d1ff] mb-8 tracking-widest">STUDENT PORTAL</h1>
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

          </div>
        </div>

        {/* Guidelines Section */}
        <div className="bg-white/5 p-6 sm:p-8 rounded-3xl border border-white/10 backdrop-blur-md">
          <h3 className="text-[#00d1ff] font-bold text-lg mb-4 flex items-center gap-2">
            <Shield size={20} />
            🔒 SECURITY GUIDELINES
          </h3>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li className="flex gap-3">
              <span className="text-red-400 font-bold">•</span>
              <span><span className="font-semibold text-red-400">⚠️ DEVICE BINDING:</span> Each register number is PERMANENTLY bound to the first device it uses. Once bound, that register number can ONLY work on that specific device.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 font-bold">•</span>
              <span><span className="font-semibold text-red-400">⚠️ ONE DEVICE = ONE REGISTER NUMBER:</span> Each device can only be used with ONE register number. You cannot use the same device for multiple students.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 font-bold">•</span>
              <span><span className="font-semibold text-red-400">ACCESS DENIED:</span> If there's any mismatch between registered device and register number, access will be blocked with an "Access Denied" message.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span>Use the same device registered during enrollment</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#00d1ff] font-bold">•</span>
              <span><span className="font-semibold text-red-400">DO NOT share this device with other students</span>. This prevents one student from marking attendance for multiple registration numbers.</span>
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
              <span><span className="font-semibold text-yellow-400">📱 LOST PHONE?</span> If you lose your phone and buy a new one, <span className="font-semibold">contact your administrator</span> to reset your device binding. You can then use the same register number and mobile number on your new device.</span>
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
    </div>
  );
};

export default StudentPortal;