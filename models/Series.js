const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  genre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  seasons: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  description: {
    type: DataTypes.TEXT
  },
  poster: {
    type: DataTypes.STRING(500),
    defaultValue: '/images/default-series.jpg'
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'series'
});

module.exports = Series;