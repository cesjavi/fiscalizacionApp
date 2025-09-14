import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Determine credentials from environment variables. Prefer an explicit
// service account JSON if provided, otherwise fall back to the default
// application credentials.
const serviceAccountEnv =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;

let firebaseCredential;

if (serviceAccountEnv) {
  try {
    const serviceAccountJson = serviceAccountEnv.trim().startsWith('{')
      ? serviceAccountEnv
      : readFileSync(serviceAccountEnv, 'utf8');
    firebaseCredential = cert(JSON.parse(serviceAccountJson));
  } catch (err) {
    console.error('Error parsing Firebase credentials from environment:', err);
  }
}

initializeApp({
  credential: firebaseCredential || applicationDefault(),
});

// Export the Firestore instance as `db` and a convenience reference to the
// `users` collection used throughout the API routes.
export const db = getFirestore();
export const usersCollection = db.collection('users');
