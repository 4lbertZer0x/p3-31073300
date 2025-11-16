const request = require('supertest');

describe('Productos públicos', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    const { app: expressApp } = require('../app');
    app = expressApp;
  });

  test('GET /products debe responder sin auth', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
  });

  test('GET /p/:id-:slug redirige 301 si slug incorrecto', async () => {
    // Mock product returned by DatabaseService in tests/setup.js is null; create a temporary mock
    const db = require('../services/DatabaseService');
    db.Product.findByPk = jest.fn().mockResolvedValue({ id: 123, slug: 'correct-slug', toJSON: () => ({ id: 123, slug: 'correct-slug' }) });

    const res = await request(app).get('/p/123-wrong-slug');
    expect(res.status).toBe(301);
    expect(res.headers).toHaveProperty('location', '/p/123-correct-slug');
  });
});
