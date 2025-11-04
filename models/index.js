const { sequelize } = require('../config/database');
const User = require('./User');
const Review = require('./Review');
const Movie = require('./Movie');

// Relaciones simples
User.hasMany(Review, { foreignKey: 'user_id' });
Review.belongsTo(User, { foreignKey: 'user_id' });

// Sincronización
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a SQLite establecida.');
    
    await sequelize.sync({ force: false });
    console.log('✅ Modelos sincronizados.');
    
    return true;
  } catch (error) {
    console.error('❌ Error de base de datos:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  User,
  Review,
  Movie,
  initializeDatabase
};