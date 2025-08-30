// @vitest-environment node
import request from 'supertest';
import { vi } from 'vitest';

process.env.JWT_SECRET = 'testsecret';

const users = new Map();

vi.mock('./firebase/index.js', () => ({
  usersCollection: {
    doc: (id: string) => ({
      async get() {
        const data = users.get(id);
        return { exists: !!data, data: () => data };
      },
      async set(data) {
        users.set(id, data);
      },
    }),
    async get() {
      return {
        docs: Array.from(users.entries()).map(([id, data]) => ({
          id,
          data: () => data,
        })),
      };
    },
  },
}));

import app from './index.js';

beforeEach(() => {
  users.clear();
});

describe('Users API auth', () => {
  it('denies access without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('allows access with token and hides passwordHash', async () => {
    const newUser = { email: 'test@example.com', dni: '123', password: 'pass' };
    await request(app).post('/api/users').send(newUser);
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ dni: '123', password: 'pass' });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const user = res.body.find(u => u.dni === '123');
    expect(user).toBeDefined();
    expect(user).not.toHaveProperty('passwordHash');
  });
});
