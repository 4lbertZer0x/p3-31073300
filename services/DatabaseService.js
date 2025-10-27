const { User, Movie, Series, Review } = require('../models');

class DatabaseService {
  // ===== USUARIOS =====
  static async getUserById(id) {
    return await User.findByPk(id);
  }

  static async getUserByUsername(username) {
    return await User.findOne({ where: { username } });
  }

  static async getUserByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  static async createUser(userData) {
    const user = await User.create(userData);
    return user.getSafeData();
  }

  static async getAllUsers() {
    return await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
  }

  // ===== PELÍCULAS =====
  static async getAllMovies() {
    return await Movie.findAll({ order: [['title', 'ASC']] });
  }

  static async getMovieById(id) {
    return await Movie.findByPk(id);
  }

  static async createMovie(movieData) {
    return await Movie.create(movieData);
  }

  // ===== SERIES =====
  static async getAllSeries() {
    return await Series.findAll({ order: [['title', 'ASC']] });
  }

  static async getSeriesById(id) {
    return await Series.findByPk(id);
  }

  static async createSeries(seriesData) {
    return await Series.create(seriesData);
  }

  // ===== RESEÑAS =====
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
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  static async getFeaturedReviews(limit = 3) {
    return await Review.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['createdAt', 'DESC']],
      limit: limit
    });
  }

  // ===== ESTADÍSTICAS =====
  static async getStats() {
    const [users, movies, series, reviews] = await Promise.all([
      User.count(),
      Movie.count(),
      Series.count(),
      Review.count()
    ]);

    return {
      users: users || 0,
      movies: movies || 0,
      series: series || 0,
      reviews: reviews || 0
    };
  }
}

module.exports = DatabaseService;