import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const voters = db.prepare('SELECT * FROM votantes').all();
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
  } = req.body;
  const stmt = db.prepare(`INSERT INTO votantes (
    seccion, circuito, mesa, dni, nombre, apellido, numero_de_orden, genero, fechaEnviado
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
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
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

export default router;
