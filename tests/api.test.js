const request = require('supertest');

// El mock se carga automáticamente desde __mocks__
describe('API Routes', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    
    const { app: expressApp } = require('../app');
    app = expressApp;
  });

  test('GET /health debería retornar estado del servidor', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.environment).toBe('test');
  });

  test('GET /api/reviews debería retornar lista de reseñas', async () => {
    const response = await request(app).get('/api/reviews');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET / debería renderizar página principal', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('CineCríticas');
  });

  test('GET /login debería renderizar formulario de login', async () => {
    const response = await request(app).get('/login');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('Iniciar Sesión');
  });

  test('GET /api-docs debería servir documentación Swagger', async () => {
    const response = await request(app).get('/api-docs');
    expect(response.status).toBe(200);
  });
});