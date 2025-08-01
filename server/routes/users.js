import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { usersCollection } from '../firebase/index.js';

const router = Router();

// Fetch all users - primarily for development/testing purposes.
router.get('/', async (req, res) => {
  try {
    const snapshot = await usersCollection.get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Register a new user. The password is hashed before storing to Firestore.
router.post('/', async (req, res) => {
  const { email, dni, password } = req.body;
  if (!email || !dni || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await usersCollection.doc(dni).set({ email, dni, passwordHash });
    res.status(201).json({ id: dni });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login route. Verify the dni exists and the password matches the stored hash.
router.post('/login', async (req, res) => {
  const { dni, password } = req.body;
  if (!dni || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  try {
    const doc = await usersCollection.doc(dni).get();
    if (!doc.exists) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = doc.data();
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ email: user.email, dni });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;

