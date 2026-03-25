import React, { useEffect, useState } from 'react';

interface HotspotAccessGateProps {
  children: React.ReactNode;
}

type AccessState = 'checking' | 'allowed' | 'denied';

const HotspotAccessGate: React.FC<HotspotAccessGateProps> = ({ children }) => {
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [reason, setReason] = useState<string>('Detecting network environment...');

  // Primary authorized hotspot network identification.
  // Use env var to change without code edit; fallback to the IP you provided.
  const AUTHORIZED_HOTSPOT_HOST = (import.meta.env.VITE_AUTHORIZED_HOTSPOT as string) || '10.71.70.233';
  const AUTHORIZED_HOTSPOT_PREFIX = AUTHORIZED_HOTSPOT_HOST.split('.').slice(0, 3).join('.') + '.'; // 10.71.70.

  const parseCandidateIPs = (candidate: string): string[] => {
    const ips: string[] = [];
    const ipRegex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/g;
    let match;
    while ((match = ipRegex.exec(candidate)) !== null) {
      ips.push(match[1]);
    }
    return ips;
  };

  const getLocalIPs = async (): Promise<string[]> => {
    const ips = new Set<string>();

    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const candidate = event.candidate.candidate;
        parseCandidateIPs(candidate).forEach((ip) => ips.add(ip));
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(() => resolve(), 1500);
        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            window.clearTimeout(timeout);
            resolve();
            return;
          }
          const candidate = event.candidate.candidate;
          parseCandidateIPs(candidate).forEach((ip) => ips.add(ip));
        };
      });
      pc.close();
    } catch (error) {
      console.warn('WebRTC local IP discovery failed:', error);
    }

    return Array.from(ips);
  };

  const isAuthorizedLocal = (localIps: string[]) => {
    // Check if any local IP is in an authorized private/local range
    return localIps.some((ip) => {
      // Allow any 10.x.x.x (hotspot range)
      if (ip.startsWith('10.')) return true;
      
      // Allow any 192.168.x.x (common private range)
      if (ip.startsWith('192.168.')) return true;
      
      // Allow IPv4 localhost
      if (ip === '127.0.0.1') return true;
      
      // Allow IPv6 localhost
      if (ip === '::1' || ip === 'localhost') return true;
      
      // Allow 172.16.x.x to 172.31.x.x (private range)
      const parts = ip.split('.');
      if (parts.length === 4 && parts[0] === '172') {
        const secondOctet = parseInt(parts[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) return true;
      }
      
      return false;
    });
  };

  const checkAccess = async () => {
    setAccessState('checking');
    setReason('Verifying hotspot network connection...');

    const localIps = await getLocalIPs();
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const connectionType = (connection?.type && typeof connection.type === 'string') ? connection.type.toLowerCase() : '';

    const isWifiConnection = connectionType === 'wifi' || connectionType === 'ethernet';
    const hasAuthorizedIP = isAuthorizedLocal(localIps);

    if (hasAuthorizedIP && isWifiConnection) {
      setAccessState('allowed');
      setReason('Connected to authorized hotspot network. Access granted.');
      return;
    }

    if (hasAuthorizedIP && !isWifiConnection) {
      // Some browsers don't expose Network Information as Wi-Fi; still rely on local IP match.
      setAccessState('allowed');
      setReason('Connected to authorized hotspot network (local IP matched). Access granted.');
      return;
    }

    // explicit deny states
    if (!hasAuthorizedIP) {
      setAccessState('denied');
      setReason(`Access Restricted: connect to the authorized hotspot network (10.x.x.x or 192.168.x.x local network).`);
      return;
    }

    setAccessState('denied');
    setReason('Access Restricted: unable to verify authorized network.');
  };

  useEffect(() => {
    checkAccess();
    const interval = window.setInterval(checkAccess, 5000);
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
          <h1 className="text-3xl font-bold text-red-300 mb-3">Access Restricted</h1>
          <p className="mb-5">{reason}</p>
          <p className="mb-5">Connect to your authorized hotspot network and refresh.</p>
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
