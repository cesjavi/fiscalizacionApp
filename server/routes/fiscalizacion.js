import { Router } from 'express';

const router = Router();

router.post('/listarCandidatos', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.lalibertadavanzacomuna7.com/api/fiscalizacion/listarCandidatos',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.authorization || '',
        },
        body: JSON.stringify(req.body),
      }
    );

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

export default router;
