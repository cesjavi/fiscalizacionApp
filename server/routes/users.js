import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../firebase/index.js';

const router = Router();

router.get('/', async (req, res) => {
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(users);
});

router.post('/', async (req, res) => {
  const { email, dni, password } = req.body;
  if (!email || !dni || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  await db.collection('users').doc(dni).set({ email, password: hashed });
  res.status(201).json({ id: dni });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const doc = await db.collection('users').doc(username).get();
  if (!doc.exists) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = doc.data();
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ id: username, username });
});

export default router;
