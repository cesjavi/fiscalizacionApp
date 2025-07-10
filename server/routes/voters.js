import { Router } from 'express';
import VotanteEstablecimiento from '../models/VotanteEstablecimiento.js';

const router = Router();

router.get('/', async (req, res) => {
  const voters = await VotanteEstablecimiento.find();
  res.json(voters);
});

router.post('/', async (req, res) => {
  try {
    const voter = new VotanteEstablecimiento(req.body);
    await voter.save();
    res.status(201).json(voter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
