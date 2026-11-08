// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {connectAuthEmulator, getAuth} from "firebase/auth";
import {connectFirestoreEmulator, getFirestore} from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6ch0eF2NH9TELGSCxFdWooLtLVv5t4rE",
  authDomain: "swe-membership-portal.firebaseapp.com",
  projectId: "swe-membership-portal",
  storageBucket: "swe-membership-portal.firebasestorage.app",
  messagingSenderId: "699837030873",
  appId: "1:699837030873:web:d9664563473e29fd37f9c8",
  measurementId: "G-056VHBLSJ3"
};

// Local testing only: never active in production builds
const useEmulators =
  process.env.NODE_ENV === "development" &&
  process.env.REACT_APP_USE_EMULATORS === "true";

// Initialize Firebase
const app = initializeApp(
  useEmulators
    ? { ...firebaseConfig, projectId: "demo-swe-membership-portal" }
    : firebaseConfig
);

export const auth=getAuth();
export const db=getFirestore(app);

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export default app;