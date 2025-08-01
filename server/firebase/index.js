import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin using default credentials so the server can
// access Firestore. In a real deployment the credentials should be provided
// through environment configuration or a service account key.
initializeApp({
  credential: applicationDefault(),
});

// Export the Firestore instance as `db` and a convenience reference to the
// `users` collection used throughout the API routes.
export const db = getFirestore();
export const usersCollection = db.collection('users');
