const DatabaseService = require('../services/DatabaseServiceSQLite');

const initializeDatabase = async () => {
  try {
    await DatabaseService.initializeDB();
    console.log('✅ Base de datos SQLite inicializada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    return false;
  }
};

module.exports = {
  initializeDatabase
};