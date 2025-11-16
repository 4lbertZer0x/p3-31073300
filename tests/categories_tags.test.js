const request = require('supertest');

describe('Categories & Tags API (protegido)', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    const { app: expressApp } = require('../app');
    app = expressApp;
  });

  test('POST /api/categories debe fallar sin token', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Figuras' });
    expect(res.status).toBe(401);
  });

  test('GET /api/categories debe fallar sin token', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  test('POST /api/tags debe fallar sin token', async () => {
    const res = await request(app).post('/api/tags').send({ name: 'Limited' });
    expect(res.status).toBe(401);
  });
});
