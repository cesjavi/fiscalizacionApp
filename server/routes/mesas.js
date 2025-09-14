import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const mesas = db.prepare('SELECT * FROM mesas').all();
  res.json(mesas);
});

router.post('/', (req, res) => {
  const { seccion, circuito, mesa } = req.body;

  const missing = [seccion, circuito, mesa].some(
    (v) => v === undefined || v === null || v === ''
  );
  const invalidFormat =
    !Number.isInteger(Number(seccion)) ||
    !Number.isInteger(Number(circuito)) ||
    !Number.isInteger(Number(mesa));

  if (missing || invalidFormat) {
    return res.status(400).json({ error: 'Datos de mesa inválidos' });
  }

  try {
    const info = db
      .prepare('INSERT INTO mesas (seccion, circuito, mesa) VALUES (?, ?, ?)')
      .run(seccion, circuito, mesa);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Error al insertar mesa' });
  }
});

export default router;
