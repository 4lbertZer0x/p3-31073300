const { Sequelize } = require('sequelize');

// Configuración robusta que maneja DATABASE_URL undefined
const getDatabaseConfig = () => {
  // Verificar si DATABASE_URL existe y es válida
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL from environment');
    return {
      connectionString: process.env.DATABASE_URL,
      options: {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      }
    };
  }
  
  // Fallback para desarrollo o si DATABASE_URL no está configurada
  console.log('⚠️  DATABASE_URL not found, using connection parameters');
  return {
    connectionString: `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASS || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'cinecriticas'}`,
    options: {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    }
  };
};

try {
  const { connectionString, options } = getDatabaseConfig();
  const sequelize = new Sequelize(connectionString, options);

  const testConnection = async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection established');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      
      if (process.env.NODE_ENV === 'production') {
        console.log('💥 Cannot start without database in production');
        process.exit(1);
      }
      
      return false;
    }
  };

  module.exports = { sequelize, testConnection };
} catch (error) {
  console.error('💥 Error configuring database:', error.message);
  
  // En producción, salir si hay error de configuración
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  
  // En desarrollo, exportar una versión dummy
  module.exports = { 
    sequelize: null, 
    testConnection: async () => {
      console.log('⚠️  Database not available');
      return false;
    }
  };
}