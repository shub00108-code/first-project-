import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyCZAV0U2sv0Kh5JGdhcalNF9umqVKGBPS8",
  authDomain: "buddy-care-4a081.firebaseapp.com",
  projectId: "buddy-care-4a081",
  storageBucket: "buddy-care-4a081.firebasestorage.app",
  messagingSenderId: "640367966210",
  appId: "1:640367966210:web:bb1af1579b8fa67a550f1b"
};

// Initialize Firebase safely (avoiding duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
