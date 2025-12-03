const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
  tableName: 'tags',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Tag.associate = function(models) {
  Tag.belongsToMany(models.Product, {
    through: 'product_tags',
    foreignKey: 'tag_id',
    otherKey: 'product_id',
    as: 'products',
    timestamps: false
  });
};

module.exports = Tag;