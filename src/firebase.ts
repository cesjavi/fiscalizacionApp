import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB2selCzWWLxGltObAjz_KSo4ewurc5Y2Y",
  authDomain: "fiscalizacion-4dcfc.firebaseapp.com",
  projectId: "fiscalizacion-4dcfc",
  storageBucket: "fiscalizacion-4dcfc.firebasestorage.app",
  messagingSenderId: "970755478089",
  appId: "1:970755478089:web:2b775c9de9c902c5c1e598",
  measurementId: "G-SYBBGJ86Q7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

