import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCypMJilnNAD3KkM01tIh5AR7OXir4Hd0M",
  authDomain: "kncet-attendance.firebaseapp.com",
  databaseURL: "https://kncet-attendance-default-rtdb.firebaseio.com",
  projectId: "kncet-attendance",
};

// Initialize Firebase (only once)
const firebaseApp = initializeApp(firebaseConfig);

// Export Firestore db
export const db = getFirestore(firebaseApp);

// Export Realtime Database
export const realtimeDb = getDatabase(firebaseApp);

// Export app for reference and compatibility
export const app = firebaseApp;