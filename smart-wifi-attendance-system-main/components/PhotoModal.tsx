import React from 'react';
import { X } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  photoUrl: string | null;
  studentName?: string;
  regNumber?: string;
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  photoUrl,
  studentName,
  regNumber,
  onClose
}) => {
  if (!isOpen || !photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Neon Glow Background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff007a] rounded-full blur-[150px] opacity-5"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d1ff] rounded-full blur-[150px] opacity-5"></div>

      <div
        className="relative w-full max-w-sm bg-black border-2 border-[#ff007a] rounded-[30px] overflow-hidden shadow-[0_0_50px_rgba(255,0,122,0.4)] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Neon Border Glow */}
        <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-[#ff007a]/20 to-[#00d1ff]/20 opacity-0"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/70 border border-[#ff007a] rounded-full hover:bg-[#ff007a] hover:text-black transition-all shadow-lg"
        >
          <X size={24} />
        </button>

        {/* Image Container */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-black">
          <img
            src={photoUrl}
            alt={studentName || 'Student Photo'}
            className="w-full h-auto object-cover"
          />

          {/* Verification Badge */}
          <div className="absolute top-4 left-4 px-4 py-2 bg-[#00ffa3]/90 text-black rounded-full text-xs font-bold tracking-widest shadow-lg">
            VERIFIED
          </div>
        </div>

        {/* Student Info */}
        {(studentName || regNumber) && (
          <div className="relative p-6 bg-gradient-to-t from-black/80 to-transparent">
            {studentName && (
              <h3 className="text-white font-bold text-lg mb-1">{studentName}</h3>
            )}
            {regNumber && (
              <p className="text-[#00d1ff] text-sm font-mono">{regNumber}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="relative p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-white/5 border border-white/20 text-white rounded-lg font-bold text-xs hover:bg-white/10 transition-all"
          >
            CLOSE
          </button>
          <button
            onClick={() => {
              // Download functionality can be added here
              const link = document.createElement('a');
              link.href = photoUrl;
              link.download = `${studentName || 'photo'}_${regNumber || Date.now()}.jpg`;
              link.click();
            }}
            className="flex-1 py-2 bg-[#ff007a]/20 border border-[#ff007a] text-[#ff007a] rounded-lg font-bold text-xs hover:bg-[#ff007a] hover:text-white transition-all"
          >
            DOWNLOAD
          </button>
        </div>
      </div>

      {/* Animation Styles */}
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
      `}} />
    </div>
  );
};

export default PhotoModal;
