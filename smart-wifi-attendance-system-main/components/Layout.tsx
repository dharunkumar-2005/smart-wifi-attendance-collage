import React from 'react';
import { Users, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'student' | 'admin';
  onTabChange: (tab: 'student' | 'admin') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ 
        // Neenga kudutha link-ah inga add pannittaen
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.6)), url('https://tse1.mm.bing.net/th/id/OIP.naInxXObx0E1JgYlca249gHaEA?rs=1&pid=ImgDetMain&o=7&rm=3')` 
      }}
    >
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-xl tracking-tight hidden sm:block">SmartAttend</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onTabChange('student')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all duration-300 ${
                activeTab === 'student'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Student</span>
            </button>
            
            <button
              onClick={() => onTabChange('admin')}
              className={`hidden sm:flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all duration-300 ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {children}
        </div>
      </main>

      <footer className="bg-white/60 backdrop-blur-sm border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-900 font-bold text-sm tracking-wide uppercase">Campus SmartAttendance System</p>
          <p className="text-slate-500 text-[10px] mt-1 italic">Verified Network & Location Protocols Enforced</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;