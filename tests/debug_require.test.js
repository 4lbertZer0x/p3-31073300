test('debug DatabaseService mock shape', () => {
  // setup.js already calls jest.mock('../services/DatabaseService')
  const DatabaseService = require('../services/DatabaseService');
  console.log('DEBUG DatabaseService keys:', Object.keys(DatabaseService));
  expect(DatabaseService).toBeDefined();
});
