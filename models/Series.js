// models/Series.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
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

  return Series;
};