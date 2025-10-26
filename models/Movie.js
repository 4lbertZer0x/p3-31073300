const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  genre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  director: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  duration: {
    type: DataTypes.INTEGER // en minutos
  },
  poster: {
    type: DataTypes.STRING(500),
    defaultValue: '/images/default-movie.jpg'
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
  tableName: 'movies'
});

module.exports = Movie;