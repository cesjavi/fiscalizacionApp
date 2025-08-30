import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const results = db.prepare('SELECT * FROM escrutinio').all();
  res.json(results);
});

router.post('/', (req, res) => {
  const { mesa_id, datos, foto } = req.body;
  const info = db
    .prepare('INSERT INTO escrutinio (mesa_id, datos, foto) VALUES (?, ?, ?)')
    .run(mesa_id, datos, foto ?? null);
  res.status(201).json({ id: info.lastInsertRowid });
});

export default router;
