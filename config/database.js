const { Sequelize } = require('sequelize');
const path = require('path');

// Configurar ruta de la base de datos
const getDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return path.join(require('os').tmpdir(), 'cinecriticas.db');
  }
  return path.join(__dirname, '..', 'cinecriticas.db');
};

const dbPath = getDbPath();
console.log('📁 Ruta de base de datos SQLite:', dbPath);

// Configuración simple y directa para SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a SQLite establecida correctamente.');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a SQLite:', error);
    return false;
  }
};

module.exports = { sequelize, testConnection };