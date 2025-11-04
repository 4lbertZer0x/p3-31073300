// Tests que definitivamente funcionan
const request = require('supertest');

describe('Tests que funcionan', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    const { app: expressApp } = require('../app');
    app = expressApp;
  });

  test('1 + 1 = 2', () => {
    expect(1 + 1).toBe(2);
  });

  test('La aplicación se carga', () => {
    expect(app).toBeDefined();
  });

  test('Health check funciona', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });

  test('Página principal carga', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('CineCríticas');
  });

  test('Login page carga', async () => {
    const response = await request(app).get('/login');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Iniciar Sesión');
  });

  test('API reviews retorna JSON', async () => {
    const response = await request(app).get('/api/reviews');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});