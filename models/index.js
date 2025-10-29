// models/index.js
const DatabaseService = require('../services/DatabaseServiceSQLite');

async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando SQLite...');
    const success = await DatabaseService.connect();
    
    if (success) {
      console.log('✅ SQLite inicializado correctamente');
      return true;
    } else {
      throw new Error('No se pudo conectar a SQLite');
    }
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 No se puede continuar sin base de datos');
      return false;
    }
    
    console.log('⚠️  Continuando en modo desarrollo...');
    return false;
  }
}

module.exports = { initializeDatabase };