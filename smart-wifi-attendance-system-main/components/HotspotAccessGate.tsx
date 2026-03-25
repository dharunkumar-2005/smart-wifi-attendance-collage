import React, { useEffect, useState } from 'react';

interface HotspotAccessGateProps {
  children: React.ReactNode;
}

type AccessState = 'allowed' | 'denied';

const HotspotAccessGate: React.FC<HotspotAccessGateProps> = ({ children }) => {
  const [accessState, setAccessState] = useState<AccessState>('denied');
  const [reason, setReason] = useState<string>('');

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

  const isAuthorizedLocal = (localIps: string[]): boolean => {
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
    try {
      const localIps = await getLocalIPs();
      const hasAuthorizedIP = isAuthorizedLocal(localIps);

      if (hasAuthorizedIP) {
        setAccessState('allowed');
        setReason('');
        return;
      }

      setAccessState('denied');
      setReason('Connect to authorized hotspot network (10.x.x.x or 192.168.x.x) to access.');
    } catch (error) {
      console.error('Access check error:', error);
      setAccessState('denied');
      setReason('Unable to verify network. Please connect to authorized hotspot.');
    }
  };

  useEffect(() => {
    checkAccess();
    const interval = window.setInterval(checkAccess, 5000);
    return () => window.clearInterval(interval);
  }, []);

  if (accessState === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1f1f28] text-white p-6">
        <div className="max-w-lg bg-white/10 backdrop-blur-xl rounded-2xl border border-red-400/30 p-7 text-center">
          <h1 className="text-3xl font-bold text-red-300 mb-3">Access Restricted</h1>
          <p className="mb-5">{reason}</p>
          <p className="mb-5">Make sure you are connected to the authorized hotspot network.</p>
          <button
            onClick={checkAccess}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default HotspotAccessGate;
