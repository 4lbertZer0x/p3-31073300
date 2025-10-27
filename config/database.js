const { Sequelize } = require('sequelize');

// Solo PostgreSQL - más simple y confiable
const sequelize = new Sequelize(
  process.env.DATABASE_URL, // Render proporciona esto automáticamente
  {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    
    // En producción, salir si no puede conectar a la BD
    if (process.env.NODE_ENV === 'production') {
      console.log('💥 Cannot start without database in production');
      process.exit(1);
    }
    
    return false;
  }
};

module.exports = { sequelize, testConnection };