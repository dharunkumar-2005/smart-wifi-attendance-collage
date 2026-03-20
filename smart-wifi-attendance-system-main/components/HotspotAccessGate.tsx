import React, { useState, useEffect } from 'react';
import { Lock, Wifi, AlertCircle, GripHorizontal } from 'lucide-react';

interface HotspotAccessGateProps {
  children: React.ReactNode;
}

const HotspotAccessGate: React.FC<HotspotAccessGateProps> = ({ children }) => {
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);
  const [isHotspot, setIsHotspot] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const ADMIN_PIN = 'OWNER2026';
  const HOTSPOT_IPS = ['192.168.137.1', '10.0.0.1']; // Common hotspot IPs
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Get hostname
        const { hostname } = window.location;
        
        // Check if accessing from hotspot IP
        const isFromHotspot = HOTSPOT_IPS.includes(hostname);
        
        // Check if already unlocked in this session
        const wasUnlocked = localStorage.getItem('hotspotAdminUnlocked') === 'true';
        
        setIsHotspot(isFromHotspot);
        
        if (!isFromHotspot) {
          // Localhost or direct IP access - allow full access
          setAccessGranted(true);
        } else if (wasUnlocked) {
          // Already unlocked this session
          setAccessGranted(true);
        } else {
          // Hotspot access and not unlocked - show restriction
          setAccessGranted(false);
          
          // Check if previously locked
          const lockTime = localStorage.getItem('hotspotLockTime');
          if (lockTime) {
            const elapsed = Date.now() - parseInt(lockTime);
            if (elapsed < LOCK_DURATION) {
              setIsLocked(true);
              setTimeout(() => {
                setIsLocked(false);
                localStorage.removeItem('hotspotLockTime');
              }, LOCK_DURATION - elapsed);
            } else {
              localStorage.removeItem('hotspotLockTime');
              const storedAttempts = localStorage.getItem('hotspotAttempts');
              setAttempts(storedAttempts ? parseInt(storedAttempts) : 0);
            }
          } else {
            const storedAttempts = localStorage.getItem('hotspotAttempts');
            setAttempts(storedAttempts ? parseInt(storedAttempts) : 0);
          }
        }
      } catch (error) {
        console.error('Access check error:', error);
        setAccessGranted(true); // Allow on error
      }
    };

    checkAccess();
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      setPinError('❌ Too many attempts. Please wait 5 minutes before trying again.');
      return;
    }

    if (pinInput === ADMIN_PIN) {
      // Correct PIN
      localStorage.setItem('hotspotAdminUnlocked', 'true');
      localStorage.removeItem('hotspotAttempts');
      localStorage.removeItem('hotspotLockTime');
      setAccessGranted(true);
      setPinInput('');
      setPinError('');
    } else {
      // Wrong PIN
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('hotspotAttempts', newAttempts.toString());

      if (newAttempts >= MAX_ATTEMPTS) {
        // Lock the interface
        setIsLocked(true);
        localStorage.setItem('hotspotLockTime', Date.now().toString());
        setPinError(`❌ Too many incorrect attempts. Locked for 5 minutes.`);
        setTimeout(() => {
          setIsLocked(false);
          localStorage.removeItem('hotspotLockTime');
          setPinError('');
          setAttempts(0);
          localStorage.removeItem('hotspotAttempts');
        }, LOCK_DURATION);
      } else {
        setPinError(`❌ Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }
      setPinInput('');
    }
  };

  // Loading state
  if (accessGranted === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#05050a] via-[#0a0a15] to-[#05050a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
            <p className="text-white font-bold tracking-widest">Verifying Access...</p>
          </div>
        </div>
      </div>
    );
  }

  // Access restricted page for hotspot users
  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#05050a] via-[#0a0a15] to-[#05050a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* ANIMATED BACKGROUNDS */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#ff007a] rounded-full blur-[150px] opacity-15 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00d1ff] rounded-full blur-[150px] opacity-15 animate-pulse"></div>

        <div className="relative z-10 w-full max-w-md">
          {/* RESTRICTION MESSAGE */}
          {isLocked ? (
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-xl p-8 rounded-3xl border border-red-500/30 text-center animate-in fade-in">
              <div className="mb-6 flex justify-center">
                <div className="p-4 bg-red-500/20 border border-red-500 rounded-2xl">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <h1 className="text-3xl font-black mb-4 text-red-400">ACCESS LOCKED</h1>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Too many incorrect PIN attempts. Please wait 5 minutes before trying again.
              </p>
              <div className="text-sm text-gray-400">
                <p>This is a security measure to protect the attendance system.</p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 rounded-3xl border border-white/10 animate-in fade-in">
              {/* ICON */}
              <div className="mb-6 flex justify-center">
                <div className="p-4 bg-[#ff007a]/20 border border-[#ff007a] rounded-2xl animate-pulse">
                  <Wifi className="w-12 h-12 text-[#ff007a]" />
                </div>
              </div>

              {/* TITLE */}
              <h1 className="text-3xl font-black text-center mb-2">ACCESS RESTRICTED</h1>
              <p className="text-gray-400 text-center mb-6 text-sm">
                This link is protected. Only authorized users can access the system.
              </p>

              {/* RESTRICTION INFO BOX */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Lock className="w-4 h-4 text-[#00d1ff]" />
                  <span className="text-gray-300">Hotspot access detected</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <AlertCircle className="w-4 h-4 text-[#ff007a]" />
                  <span className="text-gray-300">Authentication required to proceed</span>
                </div>
              </div>

              {/* PIN INPUT FORM */}
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">
                    🔐 Enter Owner PIN
                  </label>
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError('');
                    }}
                    placeholder="••••••••"
                    maxLength={8}
                    disabled={isLocked}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00d1ff] focus:ring-2 focus:ring-[#00d1ff]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-center font-bold text-lg tracking-widest"
                  />
                </div>

                {/* ERROR MESSAGE */}
                {pinError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3 animate-in fade-in">
                    {pinError}
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isLocked || pinInput.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-bold text-sm hover:shadow-[0_0_20px_#00d1ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 uppercase tracking-widest"
                >
                  Unlock System
                </button>
              </form>

              {/* HELP TEXT */}
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-xs text-gray-500">
                  🛡️ This system is protected to ensure data security and prevent unauthorized access.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full access granted
  return <>{children}</>;
};

export default HotspotAccessGate;
