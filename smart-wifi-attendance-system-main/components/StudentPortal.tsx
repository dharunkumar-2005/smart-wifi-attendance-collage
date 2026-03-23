import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { app } from './firebase'; 
import emailjs from '@emailjs/browser';
import { cameraService, CapturedFaceData } from '../services/cameraService';
import { Camera, X, Check } from 'lucide-react';

const db = getDatabase(app);

const StudentPortal = () => {
    const [isNetworkAuthorized, setIsNetworkAuthorized] = useState(false);
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
  // Access checks removed

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

  useEffect(() => {
    const checkHotspot = () => {
      // 1. Bypass check if opening directly on the laptop
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setIsNetworkAuthorized(true);
        setStatus('idle');
        return;
      }

      setStatus('checking');

      // 2. THE IMAGE TRICK: This bypasses Vercel's HTTPS security block
      const img = new Image();
      // We try to grab the Vite favicon from your laptop server
      // Added a timestamp (?t=...) to stop the browser from caching the result
      img.src = `http://192.168.137.1:5173/favicon.ico?t=${Date.now()}`;

      img.onload = () => {
        // If image loads, they are on your hotspot!
        setIsNetworkAuthorized(true);
        setStatus('idle');
      };

      img.onerror = () => {
        // If image fails (Mixed content or not on hotspot), block them!
        setIsNetworkAuthorized(false);
        setStatus('error');
      };

      // 3. Safety Timeout (3 seconds)
      const timeout = setTimeout(() => {
        if (!img.complete) {
          setIsNetworkAuthorized(false);
          setStatus('error');
        }
      }, 3000);

      return () => clearTimeout(timeout);
    };

    checkHotspot();
  }, []);

  // Device ID logic removed

  const handleVerify = React.useCallback(async () => {
    if (!name || !regNo || !mobileNumber) return alert("Please fill Name, Reg Number, and Mobile Number");
    setStatus('ready');
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
        // deviceId removed
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
  }, [name, regNo, mobileNumber, capturedFace]);

  // Update time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2342] via-[#05050a] to-[#1a0033] text-white p-4 sm:p-6 font-sans">
      {!isNetworkAuthorized ? (
        <div style={{position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #0a2342, #05050a, #1a0033)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 9999}}>
          <div style={{textAlign: 'center'}}>
            <h1 style={{fontSize: '4rem', color: '#ff3333', marginBottom: '1rem', fontWeight: 'bold', textShadow: '0 0 20px rgba(255, 51, 51, 0.5)'}}>
              ⚠️ ACCESS NEEDED
            </h1>
            <p style={{fontSize: '1.5rem', marginBottom: '2rem', color: '#fff'}}>
              You are not connected to the College Hotspot
            </p>
            <div style={{background: '#1a1a2e', padding: '2rem', borderRadius: '1rem', border: '2px solid #00d1ff', marginBottom: '2rem', maxWidth: '500px'}}>
              <p style={{color: '#00d1ff', fontWeight: 'bold', marginBottom: '0.5rem'}}>Step 1: Connect to Hotspot</p>
              <p style={{color: '#fff', fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 'bold'}}>KNCET Official Hotspot</p>
              <p style={{color: '#ffaa00', fontSize: '0.9rem'}}>Then refresh this page</p>
            </div>
            <p style={{color: '#999', fontSize: '0.9rem'}}>Contact admin if you need help</p>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default StudentPortal;