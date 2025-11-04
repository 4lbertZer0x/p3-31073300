const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Series = sequelize.define('Series', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  year: {
    type: DataTypes.STRING,
    allowNull: false
  },
  genre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  seasons: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  poster_url: {
    type: DataTypes.STRING,
    defaultValue: '/images/default-poster.jpg'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'series'
});

module.exports = Series;