// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth=getAuth();
export const db=getFirestore(app);
export default app;