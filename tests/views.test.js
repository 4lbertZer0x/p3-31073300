const request = require('supertest');
const { app } = require('../app');

describe('Views and Pages', () => {
  test('GET / debería renderizar página principal', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('CineCríticas');
    expect(response.text).toContain('Reseñas');
  });

  test('GET /login debería renderizar formulario de login', async () => {
    const response = await request(app).get('/login');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('Iniciar Sesión');
    expect(response.text).toContain('username');
    expect(response.text).toContain('password');
  });

  test('GET /register debería renderizar formulario de registro', async () => {
    const response = await request(app).get('/register');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('Registrarse');
    expect(response.text).toContain('email');
  });

  test('GET /admin debería redirigir sin autenticación', async () => {
    const response = await request(app).get('/admin');
    
    expect(response.status).toBe(302); // Redirección
    expect(response.headers.location).toBe('/login');
  });
});