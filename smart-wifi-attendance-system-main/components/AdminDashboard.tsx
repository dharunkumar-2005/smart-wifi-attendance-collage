// @ts-nocheck
import React from 'react';

const AdminDashboard = ({ records, students, onRegister, onExport, onLogout, onDeleteStudent, onDeleteAttendance, onWipeDevice }) => {
  return (
    <div className="min-h-screen bg-[#05050a] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* 1. BACKGROUND NEON GLOWS (Image-la irukkura maari) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#ff007a] rounded-full blur-[150px] opacity-10"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#00d1ff] rounded-full blur-[150px] opacity-10"></div>

      {/* 2. MAIN NEON GLASS CARD */}
      <div className="relative z-10 w-full max-w-[950px] h-[600px] bg-white/[0.02] backdrop-blur-3xl rounded-[50px] border-[1.5px] border-[#ff007a] shadow-[0_0_50px_rgba(255,0,122,0.2)] flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT SECTION: Branding & Actions */}
        <div className="w-full md:w-[350px] p-10 border-r border-white/10 flex flex-col justify-between bg-black/20">
          <div>
            <h1 className="text-white text-5xl font-black tracking-tighter italic">
              KNCET <span className="text-[#ff007a]">PORTAL</span>
            </h1>
            <p className="text-gray-500 text-[10px] mt-2 tracking-[5px] uppercase font-bold">
              Advanced Monitoring System
            </p>
            
            <div className="mt-16 space-y-5">
              <button 
                onClick={onRegister}
                className="w-full py-4 bg-transparent border border-[#00ffa3] text-[#00ffa3] rounded-2xl font-black text-sm tracking-widest hover:bg-[#00ffa3]/10 transition-all shadow-[0_0_20px_rgba(0,255,163,0.15)]"
              >
                + REGISTER STUDENT
              </button>
              
              <button 
                className="w-full py-4 bg-[#1a1a2e]/50 border border-white/10 text-gray-400 rounded-2xl font-bold text-sm"
              >
                REGISTER STUDENT (ID)
              </button>

              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-white/5 border border-white/10 text-[#00d1ff] rounded-xl text-xs font-bold uppercase tracking-widest">
                  Action
                </button>
                <div className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-center text-xs font-bold">
                  168
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={onExport}
              className="w-full py-3 bg-transparent border border-[#00d1ff] text-[#00d1ff] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#00d1ff]/10 transition-all"
            >
              Download Excel
            </button>
            
            <div className="flex gap-2">
               <button onClick={onLogout} className="flex-1 py-3 bg-white/5 border border-white/10 text-white/50 rounded-xl text-[10px] font-bold uppercase hover:text-white transition-all">
                Logout
               </button>
               <button onClick={onLogout} className="flex-1 py-3 bg-white/5 border border-white/10 text-white/50 rounded-xl text-[10px] font-bold uppercase hover:text-white transition-all">
                Logout
               </button>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Student Management */}
        <div className="flex-1 p-10 flex flex-col bg-gradient-to-br from-transparent to-black/30">
          <div className="flex items-center gap-4 mb-8">
             <span className="text-white font-black text-2xl opacity-50">2</span>
             <h3 className="text-white text-sm font-bold tracking-widest uppercase opacity-80">Student Management</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {students && Object.keys(students).length > 0 ? Object.entries(students).map(([regNo, student]: [string, any]) => (
              <div key={regNo} className="relative group bg-white/[0.03] border border-white/5 p-4 rounded-[25px] flex items-center justify-between hover:bg-white/[0.07] transition-all hover:border-[#ff007a]/30">
                {/* Image-la irukkura Pink Vertical Glow Bar */}
                <div className="absolute left-0 top-1/4 bottom-1/4 w-[5px] bg-[#ff007a] rounded-r-full shadow-[0_0_15px_#ff007a]"></div>
                
                <div className="pl-6">
                  <h4 className="text-white font-bold text-sm tracking-wide capitalize">
                    {student.name || "Student Name"}
                  </h4>
                  <p className="text-gray-500 text-[10px] mt-1">
                    {regNo} | Device: {student.deviceId ? 'Bound' : 'Not Bound'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onWipeDevice(regNo)}
                    className="px-3 py-2 bg-transparent border border-[#ff7a00] text-[#ff7a00] rounded-full text-[10px] font-bold hover:bg-[#ff7a00] hover:text-white transition-all shadow-[0_0_10px_rgba(255,122,0,0.2)]"
                  >
                    WIPE DEVICE
                  </button>
                  <button 
                    onClick={() => onDeleteStudent(regNo)}
                    className="px-3 py-2 bg-transparent border border-red-500 text-red-500 rounded-full text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            )) : (
              <div className="h-full flex items-center justify-center text-gray-600 italic text-sm">
                No students registered...
              </div>
            )}
          </div>

          {/* Attendance Logs Section */}
          <div className="mt-8">
            <h3 className="text-white text-sm font-bold tracking-widest uppercase opacity-80 mb-4">Recent Attendance Logs</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {records && records.length > 0 ? records.slice(0, 5).map((record, index) => (
                <div key={index} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-white text-xs font-bold">{record.data.name}</span>
                    <span className="text-gray-500 text-[10px] ml-2">{record.data.regNo} | {record.data.date} {record.data.time}</span>
                  </div>
                  <button 
                    onClick={() => onDeleteAttendance(record.id)}
                    className="px-2 py-1 bg-red-500/20 border border-red-500 text-red-500 rounded text-[8px] font-bold hover:bg-red-500 hover:text-white"
                  >
                    DEL
                  </button>
                </div>
              )) : (
                <div className="text-gray-600 italic text-xs">No logs...</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CUSTOM SCROLLBAR CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ff007a; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default AdminDashboard;