const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/cinecriticas.db'),  // ← Aquí se define
  logging: false,
});

// Probar conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a SQLite establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    return false;
  }
};

module.exports = { sequelize, testConnection };