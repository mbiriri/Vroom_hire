// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// 1. Import Authentication, Firestore, and Storage SDKs
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAltc8GnHKYd3LZ8LKfCnP4lbBW8wLqdio",
  authDomain: "vroom-6d651.firebaseapp.com",
  projectId: "vroom-6d651",
  storageBucket: "vroom-6d651.firebasestorage.app",
  messagingSenderId: "683752359028",
  appId: "1:683752359028:web:9feb17ceed526320c67d21",
  measurementId: "G-L77X1H9QNR"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 2. Initialize the services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;