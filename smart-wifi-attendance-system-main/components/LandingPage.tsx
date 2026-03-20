import React, { useMemo } from 'react';
import { Shield, Users, Lock } from 'lucide-react';
import { isMobileDevice, shouldReduceEffects } from '../utils/performanceUtils';
import { emailService } from '../services/emailService';

interface LandingPageProps {
  onStaffClick: () => void;
  onStudentClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStaffClick, onStudentClick }) => {
  // no password required for staff portal

  // Mobile detection
  const isMobile = useMemo(() => isMobileDevice(), []);
  const reduceEffects = useMemo(() => shouldReduceEffects(), []);


  const handleStaffAccess = () => {
    // no authentication required
    onStaffClick();
  };




  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05050a] via-[#0a0a15] to-[#05050a] text-white overflow-hidden relative">
      
      {/* BACKGROUND IMAGE WITH GLASSMORPHISM */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://tse1.mm.bing.net/th/id/OIP.naInxXObx0E1JgYlca249gHaEA?pid=Api&P=0&h=180)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: isMobile ? 'scroll' : 'fixed', // Disable parallax on mobile for performance
          willChange: 'background-image',
          transform: 'translateZ(0)'
        }}
      />
      
      {/* GLASSMORPHISM OVERLAY - Multiple layers for depth */}
      <div 
        className={`absolute inset-0 z-[1] bg-black/60 ${!reduceEffects ? 'backdrop-blur-xl' : 'backdrop-blur-sm'}`}
        style={{ 
          willChange: 'contents',
          transform: 'translateZ(0)'
        }}
      />
      <div 
        className="absolute inset-0 z-[2] bg-gradient-to-br from-[#05050a]/40 via-transparent to-[#0a0a15]/40"
        style={{ transform: 'translateZ(0)' }}
      />
      
      {/* ANIMATED NEON BACKGROUND ORBS - Reduce on mobile */}
      {!reduceEffects && (
        <>
          <div 
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#ff007a] rounded-full blur-[150px] opacity-15 animate-pulse z-[3]"
            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
          />
          <div 
            className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00d1ff] rounded-full blur-[150px] opacity-15 animate-pulse z-[3]"
            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
          />
        </>
      )}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00ffa3] rounded-full blur-[150px] opacity-10 z-[3]"
        style={{ willChange: 'opacity', transform: 'translate3d(-50%, -50%, 0)' }}
      />

      {/* CONTENT */}
      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-4 py-20">
        
        {/* HEADER */}
        <div className="text-center mb-20 animate-in fade-in duration-500">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
            KNCET <span className="text-[#ff007a] drop-shadow-[0_0_30px_#ff007a]">ATTENDANCE</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-400 font-light tracking-[3px]">
            SMART MULTI-USER PORTAL SYSTEM
          </p>
          <div className="mt-4 inline-block px-6 py-2 bg-white/5 border border-[#00d1ff] rounded-full">
            <p className="text-sm text-[#00d1ff] tracking-widest">POWERED BY FIREBASE</p>
          </div>
        </div>

        {/* PORTAL SELECTION CARDS */}
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 mb-12">
          
          {/* STAFF PORTAL CARD */}
          <div
            onClick={handleStaffAccess}
            className="group relative cursor-pointer h-[400px] md:h-[500px] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-8 rounded-[40px] border border-white/10 hover:border-[#ff007a]/50 transition-all duration-300 overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff007a]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[40px]"></div>

            {/* Border Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[#ff007a] to-[#00d1ff] opacity-0 group-hover:opacity-20 blur rounded-[40px] transition-all duration-500"></div>

            <div className="relative z-20 h-full flex flex-col justify-between">
              {/* Icon */}
              <div className="w-20 h-20 bg-[#ff007a]/20 border border-[#ff007a] rounded-2xl flex items-center justify-center group-hover:shadow-[0_0_30px_#ff007a] transition-all">
                <Shield className="w-10 h-10 text-[#ff007a]" />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <h2 className="text-4xl font-black tracking-tighter">STAFF PORTAL</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Admin access to attendance analytics, student management, and real-time reporting.
                </p>

                <div className="space-y-3 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 text-xs">
                    <Lock className="w-4 h-4 text-[#ff007a]" />
                    <span className="text-gray-300">Password Protected</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Shield className="w-4 h-4 text-[#ff007a]" />
                    <span className="text-gray-300">Admin Dashboard</span>
                  </div>
                </div>
              </div>

              {/* Button */}
              <button className="w-full py-4 bg-gradient-to-r from-[#ff007a] to-[#ff1493] text-white rounded-xl font-black text-sm tracking-[2px] hover:shadow-[0_0_40px_#ff007a] transition-all active:scale-95 group-hover:shadow-[0_0_30px_#ff007a]">
                ACCESS STAFF PORTAL
              </button>
            </div>
          </div>

          {/* STUDENT PORTAL CARD */}
          <div
            onClick={onStudentClick}
            className="group relative cursor-pointer h-[400px] md:h-[500px] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-8 rounded-[40px] border border-white/10 hover:border-[#00d1ff]/50 transition-all duration-300 overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d1ff]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[40px]"></div>

            {/* Border Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] opacity-0 group-hover:opacity-20 blur rounded-[40px] transition-all duration-500"></div>

            <div className="relative z-20 h-full flex flex-col justify-between">
              {/* Icon */}
              <div className="w-20 h-20 bg-[#00d1ff]/20 border border-[#00d1ff] rounded-2xl flex items-center justify-center group-hover:shadow-[0_0_30px_#00d1ff] transition-all">
                <Users className="w-10 h-10 text-[#00d1ff]" />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <h2 className="text-4xl font-black tracking-tighter">STUDENT PORTAL</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Mark your attendance with photo verification using device camera.
                </p>

                <div className="space-y-3 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 text-xs">
                    <Users className="w-4 h-4 text-[#00d1ff]" />
                    <span className="text-gray-300">Open Access</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Users className="w-4 h-4 text-[#00d1ff]" />
                    <span className="text-gray-300">Camera Integration</span>
                  </div>
                </div>
              </div>

              {/* Button */}
              <button className="w-full py-4 bg-gradient-to-r from-[#00d1ff] to-[#00ffa3] text-black rounded-xl font-black text-sm tracking-[2px] hover:shadow-[0_0_40px_#00d1ff] transition-all active:scale-95 group-hover:shadow-[0_0_30px_#00d1ff]">
                ACCESS STUDENT PORTAL
              </button>
            </div>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <div className="w-full max-w-5xl mt-16">
          <h3 className="text-center text-sm font-black tracking-[4px] text-gray-400 mb-8 uppercase">System Features</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: '📊', label: 'Analytics' },
              { icon: '🎥', label: 'Photo Verification' },
              { icon: '📧', label: 'Email Alerts' },
              { icon: '📥', label: 'Excel Export' }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="text-center p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all hover:bg-white/10"
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <p className="text-xs font-bold text-gray-300 tracking-widest">{feature.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* ANIMATIONS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(4px);
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-in {
          opacity: 1;
        }
        .fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .duration-500 {
          animation-duration: 0.5s;
        }
      `}} />
    </div>
  );
};

export default LandingPage;
