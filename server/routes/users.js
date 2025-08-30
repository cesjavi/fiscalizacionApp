import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usersCollection } from '../firebase/index.js';
import logger from '../logger.js';

const router = Router();

// Simple JWT authentication middleware
function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Fetch all users - requires authentication.
router.get('/', authenticate, async (req, res) => {
  try {
    const snapshot = await usersCollection.get();
    const users = snapshot.docs.map(doc => {
      const { passwordHash, ...safeData } = doc.data();
      return { id: doc.id, ...safeData };
    });
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

    if (!process.env.JWT_SECRET) {
      logger.error('JWT secret not set', { dni, timestamp });
      return res.status(500).json({ error: 'Server misconfigured' });
    }

    const token = jwt.sign(
      { email: user.email, dni, uid: user.uid },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ email: user.email, dni, uid: user.uid, token });
  } catch (err) {
    logger.error('Login failed', { dni, timestamp, error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
