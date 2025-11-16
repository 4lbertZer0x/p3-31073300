// models/index.js
const { Sequelize } = require('sequelize');
const path = require('path');

// Configuración de la base de datos SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: process.env.NODE_ENV !== 'production' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  }
});

// Importar modelos
const User = require('./User')(sequelize);
const Review = require('./Review')(sequelize);
const Movie = require('./Movie')(sequelize);
const Category = require('./Category')(sequelize);
const Tag = require('./Tag')(sequelize);
const Product = require('./Product')(sequelize);
const Series = require('./Series')(sequelize);

// Definir asociaciones
if (Movie.associate) Movie.associate({ Review, User, Product });
if (Review.associate) Review.associate({ Movie, User });
if (User.associate) User.associate({ Review });
if (Product.associate) Product.associate({ Movie });

// Función para inicializar la base de datos
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');
    
    // Sincronizar modelos
    await sequelize.sync({ force: false });
    console.log('✅ Modelos sincronizados con la base de datos.');
    
    return true;
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  User,
  Review,
  Movie,
  Category,
  Tag,
  Product,
  Series,
  initializeDatabase
};