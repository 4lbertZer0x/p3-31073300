const DatabaseService = require('../services/DatabaseService');

async function initializeDatabase() {
  try {
    console.log('🔄 Conectando a PostgreSQL...');
    
    // Verificar conexión ejecutando una consulta simple
    const result = await DatabaseService.getClient().query('SELECT NOW() as current_time');
    console.log('✅ PostgreSQL conectado correctamente:', result.rows[0].current_time);
    
    // Verificar si las tablas existen, si no, crearlas
    await createTablesIfNotExist();
    
    return true;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    
    // En producción, no podemos continuar sin base de datos
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 No se puede continuar en producción sin base de datos');
      return false;
    }
    
    console.log('⚠️  Modo desarrollo: continuando sin base de datos');
    return false;
  }
}

async function createTablesIfNotExist() {
  try {
    // Tabla de usuarios
    await DatabaseService.getClient().query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de reseñas
    await DatabaseService.getClient().query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        movie_title VARCHAR(200) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de sesiones (para connect-pg-simple)
    await DatabaseService.getClient().query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL PRIMARY KEY,
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL
      )
    `);

    console.log('✅ Tablas verificadas/creadas correctamente');
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };