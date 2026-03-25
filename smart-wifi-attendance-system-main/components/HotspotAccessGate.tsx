import React from 'react';

interface HotspotAccessGateProps {
  children: React.ReactNode;
}

const HotspotAccessGate: React.FC<HotspotAccessGateProps> = ({ children }) => {
  // No access restrictions - everyone can access from any network
  return <>{children}</>;
};

export default HotspotAccessGate;

