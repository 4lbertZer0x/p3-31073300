// tests/database.test.js
// Clean tests that use the exported DatabaseService instance
const DatabaseService = require('../services/DatabaseService');

describe('Database Service', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
  });

  test('debería inicializar correctamente', async () => {
    // initialize is an instance method on the exported service
    const result = await DatabaseService.initialize();
    expect(result).toBe(true);
  });

  test('debería obtener información de debug', async () => {
    const info = await DatabaseService.getDebugInfo();
    expect(info).toBeDefined();
    expect(info).toHaveProperty('database');
  });

  test('debería crear usuario', async () => {
    const ts = Date.now();
    const username = `testuser_${ts}`;
    const email = `test_${ts}@example.com`;
    const userData = {
      username,
      email,
      password_hash: 'password123'
    };
    const user = await DatabaseService.createUser(userData);
    expect(user).toBeDefined();
    expect(user.username).toBe(username);
  });

  test('debería obtener usuario por username', async () => {
    // use the last created user: find any user starting with testuser_
    const found = await DatabaseService.User.findOne({ where: { username: { [require('sequelize').Op.like]: 'testuser_%' } }, order: [['created_at','DESC']] });
    expect(found).toBeDefined();
    expect(found.username.startsWith('testuser_')).toBe(true);
  });
});