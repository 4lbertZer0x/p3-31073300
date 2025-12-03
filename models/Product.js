const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
let slugify;
try {
  slugify = require('slugify');
} catch (e) {
  // Fallback simple slug function
  slugify = (text, opts) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
}

// Línea de productos: Figuras de Colección

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
    type: DataTypes.DECIMAL(10,2),
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
  edition: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  release_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // ✅ ACTUALIZADO: Solo 'purchase' ya que ya tienes Membership en User
  kind: {
    type: DataTypes.ENUM('purchase'),
    allowNull: false,
    defaultValue: 'purchase'
  },
  // ✅ IMPORTANTE: Referencia a Movie (para películas/series)
  movie_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'movies',
      key: 'id'
    }
  },
  // ✅ REMOVIDO: membership_billing_interval (ya está en User)
  // ✅ REMOVIDO: membership_trial_days (ya está en User)
  // ✅ REMOVIDO: membership_benefits (ya está en User)
  slug: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  images: {
    type: DataTypes.TEXT, // JSON serializado
    allowNull: true,
    get() {
      const raw = this.getDataValue('images');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
    set(val) {
      this.setDataValue('images', Array.isArray(val) ? JSON.stringify(val) : val);
    }
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['slug']
    },
    {
      fields: ['movie_id']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['sku'],
      unique: true
    }
  ]
});

// ✅ AGREGAR: Método de asociaciones
Product.associate = function(models) {
  // Un producto pertenece a una categoría
  Product.belongsTo(models.Category, {
    foreignKey: 'category_id',
    as: 'category'
  });
  
  // Un producto tiene muchas tags (relación muchos-a-muchos)
  Product.belongsToMany(models.Tag, {
    through: 'product_tags',
    foreignKey: 'product_id',
    otherKey: 'tag_id',
    as: 'tags',
    timestamps: false
  });
  
  // Un producto puede estar asociado a una película
  Product.belongsTo(models.Movie, {
    foreignKey: 'movie_id',
    as: 'movie'
  });
};

// ✅ AGREGAR: Hook mejorado para slug
Product.addHook('beforeValidate', async (product, options) => {
  if (product.name && (!product.slug || product.changed('name'))) {
    let base = slugify(product.name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;

    // Buscar slug único excluyendo el producto actual
    const Model = product.constructor;
    const whereClause = { slug };
    if (product.id) {
      whereClause.id = { [sequelize.Sequelize.Op.ne]: product.id };
    }

    while (true) {
      const existing = await Model.findOne({ where: whereClause });
      if (!existing) break;
      slug = `${base}-${counter}`;
      whereClause.slug = slug;
      counter++;
    }
    product.slug = slug;
  }
});

// ✅ AGREGAR: Métodos de instancia útiles
Product.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Formatear precio como número
  if (values.price) {
    values.price = parseFloat(values.price);
  }
  
  // Asegurar que las relaciones estén incluidas
  if (this.category) {
    values.category = this.category;
  }
  
  if (this.tags) {
    values.tags = this.tags;
  }
  
  if (this.movie) {
    values.movie = this.movie;
  }
  
  return values;
};

module.exports = Product;