import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

router.post('/', (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
    .run(username, hashed);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ id: user.id, username: user.username });
});

export default router;
