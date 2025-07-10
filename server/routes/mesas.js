import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const mesas = db.prepare('SELECT * FROM mesas').all();
  res.json(mesas);
});

router.post('/', (req, res) => {
  const { seccion, circuito, mesa } = req.body;
  const info = db
    .prepare('INSERT INTO mesas (seccion, circuito, mesa) VALUES (?, ?, ?)')
    .run(seccion, circuito, mesa);
  res.status(201).json({ id: info.lastInsertRowid });
});

export default router;
