import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare('SELECT * FROM users WHERE username = ? AND password = ?')
    .get(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ id: user.id, username: user.username });
});

router.post('/', (req, res) => {
  const { username, password } = req.body;
  const info = db
    .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
    .run(username, password);
  res.status(201).json({ id: info.lastInsertRowid });
});

export default router;
