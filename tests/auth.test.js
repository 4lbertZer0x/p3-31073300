const request = require('supertest');

describe('Integración - Rutas públicas', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    const { app: expressApp } = require('../app');
    app = expressApp;
  });

  describe('Rutas GET públicas', () => {
    test('/health - debería responder con JSON', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
    });

    test('/ - debería servir la página principal', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('CineCríticas');
    });

    test('/login - debería servir formulario de login', async () => {
      const response = await request(app).get('/login');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Iniciar Sesión');
    });

    test('/register - debería servir formulario de registro', async () => {
      const response = await request(app).get('/register');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Registrarse');
    });
  });

  describe('API pública', () => {
    test('/api/reviews - debería retornar reseñas', async () => {
      const response = await request(app).get('/api/reviews');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('/api-docs - debería servir Swagger UI', async () => {
      const response = await request(app).get('/api-docs');
      expect(response.status).toBe(200);
    });
  });
});