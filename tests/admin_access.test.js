const request = require('supertest');
const { app } = require('../app');
const DatabaseService = require('../services/DatabaseService');

describe('Admin access flow', () => {
  test('login with email or username allows accessing /admin', async () => {
    // Ensure test users exist
    await DatabaseService.ensureTestUsers();

    // Try login with admin email
    const agent = request.agent(app);
    const loginRes = await agent
      .post('/auth/login')
      .type('form')
      .send({ username: 'admin@cinecriticas.com', password: 'admin123' })
      .expect(302);

    // Now access /admin
    const adminRes = await agent.get('/admin').expect(200);
    expect(adminRes.text).toMatch(/Panel de Administración|ADMIN PANEL|Usuarios/);
  }, 20000);
});
