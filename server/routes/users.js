import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(users);
});

router.post('/', (req, res) => {
  const { username, password } = req.body; // password already hashed
  const info = db
    .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
    .run(username, password);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body; // password is already hashed
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ id: username, username });
});

export default router;
