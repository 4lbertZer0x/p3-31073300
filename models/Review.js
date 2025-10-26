const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content_type: {
    type: DataTypes.ENUM('movie', 'series'),
    allowNull: false
  },
  content_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(200),
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
  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contains_spoilers: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'reviews',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['content_type', 'content_id']
    }
  ]
});

module.exports = Review;