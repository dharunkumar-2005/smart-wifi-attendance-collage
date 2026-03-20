
import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord } from "../types";

export const geminiService = {
  getSmartGreeting: async (registerNumber: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a short, professional, and welcoming success message for a student with register number ${registerNumber} who just logged their attendance via the campus Wi-Fi. Keep it under 20 words.`,
      });
      return response.text || `Attendance logged for ${registerNumber}. Have a productive day!`;
    } catch (error) {
      console.error("Gemini Error:", error);
      return `Attendance logged successfully for ${registerNumber}.`;
    }
  },

  getAttendanceSummary: async (logs: AttendanceRecord[]): Promise<string> => {
    try {
      if (logs.length === 0) return "No attendance data available for analysis.";
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const summaryData = logs.slice(0, 10).map(l => `${l.registerNumber} at ${l.time}`).join(', ');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this recent attendance log data: ${summaryData}. Provide a very brief professional summary of the attendance activity and one smart insight (e.g., peak time or frequency).`,
      });
      return response.text || "Summary analysis completed.";
    } catch (error) {
      return "Unable to generate smart summary at this time.";
    }
  }
};
