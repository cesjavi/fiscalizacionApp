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
  const requiredMissing = [
    seccion,
    circuito,
    mesa,
    dni,
    nombre,
    apellido,
    numero_de_orden,
  ].some((v) => v === undefined || v === null || v === '');

  const invalidFormat =
    !Number.isInteger(Number(seccion)) ||
    !Number.isInteger(Number(circuito)) ||
    !Number.isInteger(Number(mesa)) ||
    !/^[0-9]+$/.test(String(dni)) ||
    typeof nombre !== 'string' ||
    typeof apellido !== 'string' ||
    !Number.isInteger(Number(numero_de_orden));

  if (requiredMissing || invalidFormat) {
    return res.status(400).json({ error: 'Datos de votante inválidos' });
  }

  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al insertar votante' });
  }
});

router.put('/:id/voto', (req, res) => {
  const { id } = req.params;
  const { voto } = req.body;
  if (voto === undefined || voto === null) {
    return res.status(400).json({ error: 'Dato voto inválido' });
  }
  try {
    const stmt = db.prepare('UPDATE votantes SET voto = ? WHERE id = ?');
    const info = stmt.run(voto, id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Votante no encontrado' });
    } else {
      res.json({ updated: info.changes });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar voto' });
  }
});

export default router;
