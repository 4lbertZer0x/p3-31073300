// models/Movie.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
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
    // ¡AGREGAR ESTOS CAMPOS NUEVOS!
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

  Movie.associate = function(models) {
    Movie.hasMany(models.Review, {
      foreignKey: 'movie_id',
      as: 'reviews'
    });
    Movie.hasOne(models.Product, {
      foreignKey: 'movie_id',
      as: 'product'
    });
  };

  return Movie;
};