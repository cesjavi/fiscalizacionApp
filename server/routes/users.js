import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { usersCollection } from '../firebase/index.js';
import logger from '../logger.js';

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
  const { email, dni, password, uid } = req.body;
  if (!email || !dni || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const data = { email, dni, passwordHash };
    if (uid) data.uid = uid;
    await usersCollection.doc(dni).set(data);
    res.status(201).json({ id: dni });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login route. Verify the dni exists and the password matches the stored hash.
router.post('/login', async (req, res) => {
  const { dni, password } = req.body;
  const timestamp = new Date().toISOString();
  logger.info('Login attempt', { dni, timestamp });

  if (!dni || !password) {
    logger.warn('Missing credentials', { dni, timestamp });
    return res.status(400).json({ error: 'Missing credentials' });
  }
  try {
    const doc = await usersCollection.doc(dni).get();
    if (!doc.exists) {
      logger.warn('User not found', { dni, timestamp });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = doc.data();
    if (!user || !user.passwordHash) {
      logger.warn('User data invalid', { dni, timestamp });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn('Password mismatch', { dni, timestamp });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    logger.info('Login successful', { dni, timestamp });
    res.json({ email: user.email, dni, uid: user.uid });
  } catch (err) {
    logger.error('Login failed', { dni, timestamp, error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
