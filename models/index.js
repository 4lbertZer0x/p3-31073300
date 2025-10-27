const { sequelize, testConnection } = require('../config/database');

// Importar modelos
const User = require('./User');
const Movie = require('./Movie');
const Series = require('./Series');
const Review = require('./Review');

// Configurar relaciones
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Inicializar base de datos
const initializeDatabase = async () => {
  try {
    console.log('🔄 Inicializando base de datos...');
    
    const connected = await testConnection();
    if (!connected) {
      console.log('❌ No se pudo conectar a la base de datos');
      return false;
    }

    // Sincronizar modelos
    await sequelize.sync({ force: false });
    console.log('✅ Modelos sincronizados correctamente');

    // Insertar datos de ejemplo
    await seedDatabase();
    
    return true;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    return false;
  }
};

// Datos de ejemplo
const seedDatabase = async () => {
  try {
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('✅ La base de datos ya contiene datos');
      return;
    }

    console.log('🌱 Insertando datos de ejemplo...');

    // Crear usuarios
    const users = await User.bulkCreate([
      {
        username: 'admin',
        email: 'admin@criticas.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        username: 'usuario1',
        email: 'usuario1@email.com',
        password: 'user123'
      }
    ]);

    // Crear películas
    const movies = await Movie.bulkCreate([
      {
        title: 'Inception',
        year: 2010,
        genre: 'Ciencia Ficción',
        director: 'Christopher Nolan',
        description: 'Un ladrón que roba secretos corporativos a través de los sueños.',
        rating: 8.8
      }
    ]);

    // Crear series
    const series = await Series.bulkCreate([
      {
        title: 'Stranger Things',
        year: 2016,
        genre: 'Terror',
        seasons: 4,
        description: 'Misterios sobrenaturales en un pequeño pueblo.',
        rating: 8.7
      }
    ]);

    // Crear reseñas
    await Review.bulkCreate([
      {
        user_id: users[1].id,
        content_type: 'movie',
        content_id: movies[0].id,
        title: '¡Increíble película!',
        rating: 5,
        comment: 'Una obra maestra del cine moderno.'
      }
    ]);

    console.log('✅ Datos de ejemplo insertados correctamente');

  } catch (error) {
    console.error('❌ Error insertando datos de ejemplo:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Movie,
  Series,
  Review,
  initializeDatabase
};