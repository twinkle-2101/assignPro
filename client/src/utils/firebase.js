

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain:"smartassign-aa3d6.firebaseapp.com",
  projectId: "smartassign-aa3d6",
  storageBucket: "smartassign-aa3d6.firebasestorage.app",
  messagingSenderId: "1052491330704",
  appId: "1:1052491330704:web:f2cd28f9d531b9d6b7d415",
  measurementId: "G-B8NJMF6G5K"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export {auth , provider};

