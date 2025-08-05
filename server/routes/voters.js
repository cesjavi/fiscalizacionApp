import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const voters = db
    .prepare('SELECT * FROM votantes ORDER BY numero_de_orden')
    .all();
  res.json(voters);
});

router.post('/', (req, res) => {
  const {
    seccion,
    circuito,
    mesa,
    dni,
    nombre,
    apellido,
    numero_de_orden,
    genero,
    fechaEnviado,
    voto,
  } = req.body;
  const stmt = db.prepare(`INSERT INTO votantes (
    seccion, circuito, mesa, dni, nombre, apellido, numero_de_orden, genero, fechaEnviado, voto
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(
    seccion,
    circuito,
    mesa,
    dni,
    nombre,
    apellido,
    numero_de_orden,
    genero,
    fechaEnviado,
    voto,
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id/voto', (req, res) => {
  const { id } = req.params;
  const { voto } = req.body;
  const stmt = db.prepare('UPDATE votantes SET voto = ? WHERE id = ?');
  const info = stmt.run(voto, id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Votante no encontrado' });
  } else {
    res.json({ updated: info.changes });
  }
});

export default router;
