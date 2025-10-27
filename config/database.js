const { Sequelize } = require('sequelize');
const path = require('path');

// SQLite para desarrollo, PostgreSQL para producción (Render)
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, '../data/cinecriticas.db'),
      logging: false
    });

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    const dbType = process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite';
    console.log(`✅ Conexión a ${dbType} establecida`);
    return true;
  } catch (error) {
    console.error('❌ Error conectando:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };