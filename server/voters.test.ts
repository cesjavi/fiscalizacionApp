// @vitest-environment node
import request from 'supertest';
import app from './index.js';
import db from './db.js';

describe('Voters API', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM votantes').run();
  });

  it('creates a voter via POST', async () => {
    const payload = {
      seccion: '',
      circuito: '',
      mesa: '',
      dni: '123',
      nombre: 'John',
      apellido: 'Doe',
      numero_de_orden: 1,
      genero: 'M',
      fechaEnviado: new Date().toISOString(),
    };

    const res = await request(app).post('/api/voters').send(payload);
    expect(res.status).toBe(201);

    const row = db.prepare('SELECT * FROM votantes WHERE dni = ?').get('123');
    expect(row.nombre).toBe('John');
  });
});
