import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

router.post('/', (req, res) => {
  const { username, password } = req.body;
  const info = db
    .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
    .run(username, password);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/login', (req, res) => {
  const { dni, password } = req.body;
  const user = db
    .prepare('SELECT * FROM users WHERE dni = ? AND password = ?')
    .get(dni, password);
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

export default router;
