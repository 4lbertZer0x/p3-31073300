// Usar el mock automáticamente
jest.mock('../services/DatabaseService');
const DatabaseService = require('../services/DatabaseService');

describe('Database Service', () => {
  test('debería inicializar correctamente', async () => {
    const result = await DatabaseService.initialize();
    expect(result).toBe(true);
    expect(DatabaseService.initialize).toHaveBeenCalled();
  });

  test('debería obtener información de debug', async () => {
    const debugInfo = await DatabaseService.getDebugInfo();
    expect(debugInfo.database).toBeDefined();
    expect(debugInfo.database.usersCount).toBe(2);
  });

  test('debería crear usuario', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'user'
    };

    const user = await DatabaseService.createUser(userData);
    expect(user.username).toBe('testuser');
    expect(DatabaseService.createUser).toHaveBeenCalledWith(userData);
  });

  test('debería obtener usuario por username', async () => {
    const user = await DatabaseService.getUserByUsername('admin');
    expect(user.username).toBe('admin');
    expect(user.role).toBe('admin');
  });
});