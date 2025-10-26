const { User, Movie, Series, Review } = require('../models');

class DatabaseService {
  // Usuarios
  static async getUserById(id) {
    return await User.findByPk(id);
  }

  static async getUserByUsername(username) {
    return await User.findOne({ where: { username } });
  }

  static async createUser(userData) {
    return await User.create(userData);
  }

  static async getAllUsers() {
    return await User.findAll({
      attributes: { exclude: ['password'] }
    });
  }

  // Películas
  static async getAllMovies() {
    return await Movie.findAll({ order: [['title', 'ASC']] });
  }

  static async getMovieById(id) {
    return await Movie.findByPk(id);
  }

  // Series
  static async getAllSeries() {
    return await Series.findAll({ order: [['title', 'ASC']] });
  }

  static async getSeriesById(id) {
    return await Series.findByPk(id);
  }

  // Reseñas
  static async createReview(reviewData) {
    return await Review.create(reviewData);
  }

  static async getUserReviews(userId) {
    return await Review.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']]
    });
  }

  static async getAllReviews() {
    return await Review.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  static async getFeaturedReviews() {
    return await Review.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }],
      order: [['createdAt', 'DESC']],
      limit: 3
    });
  }
}

module.exports = DatabaseService;