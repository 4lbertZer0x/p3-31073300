// models/index.js - VERSIÓN COMPLETAMENTE CORREGIDA
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

console.log('🔄 Inicializando modelos Sequelize...');

// ================= DEFINICIÓN DE MODELOS =================

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'moderator'),
    defaultValue: 'user'
  },
  membership_type: {
    type: DataTypes.ENUM('free', 'premium', 'vip'),
    defaultValue: 'free'
  },
  membership_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchase_history: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// ============ AGREGAR ESTOS MÉTODOS AL MODELO USER ============

// Método para verificar contraseña
User.prototype.verifyPassword = async function(password) {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, this.password_hash);
  } catch (error) {
    console.error('Error en verifyPassword:', error);
    return false;
  }
};

// Método para obtener datos seguros del usuario (sin password)
User.prototype.toSafeObject = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

// Hook para hashear contraseña automáticamente antes de guardar
User.beforeSave(async (user, options) => {
  if (user.changed('password_hash')) {
    const bcrypt = require('bcryptjs');
    // Si el password_hash no está ya hasheado (no empieza con $2a$)
    if (user.password_hash && !user.password_hash.startsWith('$2a$')) {
      console.log(`🔐 Hasheando contraseña para usuario: ${user.username}`);
      user.password_hash = await bcrypt.hash(user.password_hash, 10);
    }
  }
});

// Modelo Movie
const Movie = sequelize.define('Movie', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  release_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  director: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  poster_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  trailer_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  genre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('movie', 'series'),
    defaultValue: 'movie',
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'movies',
  timestamps: true,
  underscored: true
});

// Modelo Review
const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  movie_title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  movie_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  review_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  underscored: true
});

// Modelo Category
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Modelo Tag
const Tag = sequelize.define('Tag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'tags',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Modelo Product
const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  movie_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Modelo Series
const Series = sequelize.define('Series', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  release_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  director: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  seasons: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  poster_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  trailer_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'series',
  timestamps: true,
  underscored: true
});

// Modelo Purchase
const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('movie', 'series', 'membership'),
    allowNull: false,
    defaultValue: 'movie'
  },
  movie_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  movie_title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  plan_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'stripe'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'completed'
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'purchases',
  timestamps: true,
  underscored: true
});

// ================= DEFINICIÓN DE RELACIONES =================

console.log('🔄 Configurando relaciones de modelos...');

// User - Review (Uno a Muchos)
User.hasMany(Review, { 
  foreignKey: 'user_id',
  as: 'reviews'
});
Review.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user'
});

// Movie - Review (Uno a Muchos)
Movie.hasMany(Review, {
  foreignKey: 'movie_id',
  as: 'reviews'
});
Review.belongsTo(Movie, {
  foreignKey: 'movie_id', 
  as: 'movie'
});

// User - Purchase (Uno a Muchos)
User.hasMany(Purchase, {
  foreignKey: 'user_id',
  as: 'purchases'
});
Purchase.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Movie - Purchase (Uno a Muchos)
Movie.hasMany(Purchase, {
  foreignKey: 'movie_id',
  as: 'purchases'
});
Purchase.belongsTo(Movie, {
  foreignKey: 'movie_id',
  as: 'movie'
});

// Movie - Product (Uno a Uno)
Movie.hasOne(Product, {
  foreignKey: 'movie_id',
  as: 'product'
});
Product.belongsTo(Movie, {
  foreignKey: 'movie_id',
  as: 'movie'
});

// Category - Product (Uno a Muchos)
Category.hasMany(Product, { 
  foreignKey: 'category_id' 
});
Product.belongsTo(Category, { 
  foreignKey: 'category_id' 
});

// Relaciones muchos-a-muchos Product-Tag
const ProductTags = sequelize.define('ProductTags', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  }
}, {
  tableName: 'product_tags',
  timestamps: true
});

Product.belongsToMany(Tag, { 
  through: ProductTags,
  foreignKey: 'product_id',
  otherKey: 'tag_id',
  as: 'tags'
});
Tag.belongsToMany(Product, { 
  through: ProductTags,
  foreignKey: 'tag_id',
  otherKey: 'product_id',
  as: 'products'
});

console.log('✅ Relaciones de modelos definidas correctamente');

// ================= FUNCIÓN DE INICIALIZACIÓN =================

const initializeDatabase = async () => {
  try {
    console.log('🔄 Conectando a la base de datos SQLite...');
    await sequelize.authenticate();
    console.log('✅ Conexión a SQLite establecida');

    console.log('🔄 Sincronizando modelos con la base de datos...');
    await sequelize.sync({ force: false });
    console.log('✅ Todos los modelos sincronizados correctamente');

    return true;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    console.error(error.stack);
    return false;
  }
};

// ================= EXPORTACIÓN =================

module.exports = {
  sequelize,
  User,
  Review,
  Movie,
  Category,
  Tag,
  Product,
  Series,
  Purchase,
  initializeDatabase  // ← ¡ESTA LÍNEA ES CLAVE!
};