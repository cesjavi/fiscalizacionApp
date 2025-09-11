import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE = process.env.UPSTREAM_BASE ?? 'https://api.lalibertadavanzacomuna7.com/api';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST' });

  const auth = (req.headers.authorization as string) || '';

  try {
    const upstream = await fetch(`${BASE}/fiscalizacion/listarCandidatos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': auth,
        'User-Agent': (req.headers['user-agent'] as string) || 'Mozilla/5.0',
        'Accept-Language': (req.headers['accept-language'] as string) || 'es-AR,es;q=0.9,en;q=0.8'
      },
      body: JSON.stringify(req.body ?? {})
    });

    const text = await upstream.text();
    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(text);
  } catch (e: unknown) {
    const error = e as Error;
    res.status(502).json({ message: 'Upstream error', error: error.message });
  }
}
