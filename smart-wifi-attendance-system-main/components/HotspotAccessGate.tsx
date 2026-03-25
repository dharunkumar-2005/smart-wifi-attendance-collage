import React, { useEffect, useState } from 'react';

interface HotspotAccessGateProps {
  children: React.ReactNode;
}

type AccessState = 'checking' | 'allowed' | 'denied';

const HotspotAccessGate: React.FC<HotspotAccessGateProps> = ({ children }) => {
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [reason, setReason] = useState<string>('Detecting network environment...');

  // Set your protected/authorized hotspot IP here, or use environment variable VITE_AUTHORIZED_HOTSPOT.
  const AUTHORIZED_HOTSPOT_HOST = (import.meta.env.VITE_AUTHORIZED_HOTSPOT as string) || '10.71.70.233';

  const allowedSubnetCheck = (hostname: string) => {
    if (!hostname) return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    const localPatterns = [
      /^192\.168\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/
    ];

    if (localPatterns.some((p) => p.test(hostname))) return true;

    const allowedHotspotHosts = ['192.168.137.1', '192.168.43.1', '10.0.0.1', '192.168.0.1', AUTHORIZED_HOTSPOT_HOST];
    return allowedHotspotHosts.includes(hostname);
  };

  const checkAccess = () => {
    const hostname = window.location.hostname;
    const isAllowedHost = allowedSubnetCheck(hostname);
    const isAuthorizedHost = hostname === AUTHORIZED_HOTSPOT_HOST;

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const connectionType = (connection?.type && typeof connection.type === 'string') ? connection.type.toLowerCase() : '';

    const isWifiConnection = connectionType === 'wifi' || connectionType === 'ethernet';

    // Primary policy: allow only when we are on the authorized hotspot host or recognized local net
    if (isAuthorizedHost || isAllowedHost) {
      setAccessState('allowed');
      setReason('Connected to authorized network. Access granted.');
      return;
    }

    // If we know the connection type and it is not Wi-Fi/ethernet, deny explicitly.
    if (connectionType && !isWifiConnection) {
      setAccessState('denied');
      setReason(`Access Denied: connect to the authorized hotspot network (detected network type: ${connectionType}).`);
      return;
    }

    // Fallback when we cannot get reliable connection info.
    setAccessState('denied');
    setReason(`Connect to authorized network: ${AUTHORIZED_HOTSPOT_HOST} (or one of the local hotspot ranges).`);
  };

  useEffect(() => {
    checkAccess();
    const interval = window.setInterval(checkAccess, 2500);
    return () => window.clearInterval(interval);
  }, []);

  if (accessState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050a] text-white p-6">
        <div className="animate-pulse text-center">
          <h1 className="text-2xl font-semibold mb-2">Access Needed</h1>
          <p>{reason}</p>
        </div>
      </div>
    );
  }

  if (accessState === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1f1f28] text-white p-6">
        <div className="max-w-lg bg-white/10 backdrop-blur-xl rounded-2xl border border-red-400/30 p-7 text-center">
          <h1 className="text-3xl font-bold text-red-300 mb-3">Access Denied</h1>
          <p className="mb-5">{reason}</p>
          <p className="mb-5">Connect to authorized network <strong>{AUTHORIZED_HOTSPOT_HOST}</strong> and refresh the page.</p>
          <button
            onClick={checkAccess}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400"
          >
            Retry Access Check
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default HotspotAccessGate;
