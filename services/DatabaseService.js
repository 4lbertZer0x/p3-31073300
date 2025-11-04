// services/DatabaseService.js - VERSIÓN CORREGIDA

// Importación DIRECTA y simple
const models = require('../models');

class DatabaseService {
  constructor() {
    this.User = models.User;
    this.Review = models.Review;
    this.Movie = models.Movie;
    this.Series = models.Series;
    this.initializeDatabase = models.initializeDatabase;
    
    console.log('✅ DatabaseService construido - Modelos cargados');
  }

  async initialize() {
    try {
      console.log('🔄 Inicializando DatabaseService...');
      await this.initializeDatabase();
      console.log('✅ DatabaseService inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando DatabaseService:', error.message);
      return false;
    }
  }

  // ================= MÉTODOS DE USUARIOS =================
  async getUserByUsername(username) {
    try {
      console.log(`🔍 Buscando usuario: ${username}`);
      const user = await this.User.findOne({ where: { username } });
      console.log(`✅ Usuario ${username} encontrado:`, !!user);
      return user;
    } catch (error) {
      console.error('Error en getUserByUsername:', error.message);
      return null;
    }
  }

  async getUserById(id) {
    try {
      return await this.User.findByPk(id);
    } catch (error) {
      console.error('Error en getUserById:', error.message);
      return null;
    }
  }

  async getAllUsers() {
    try {
      return await this.User.findAll({
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('Error en getAllUsers:', error.message);
      return [];
    }
  }

  async createUser(userData) {
    try {
      console.log('👤 Creando usuario:', userData.username);
      const user = await this.User.create(userData);
      console.log('✅ Usuario creado:', user.username);
      return user;
    } catch (error) {
      console.error('Error en createUser:', error.message);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      const user = await this.User.findByPk(id);
      if (!user) throw new Error('Usuario no encontrado');
      return await user.update(userData);
    } catch (error) {
      console.error('Error en updateUser:', error.message);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const user = await this.User.findByPk(id);
      if (!user) throw new Error('Usuario no encontrado');
      return await user.destroy();
    } catch (error) {
      console.error('Error en deleteUser:', error.message);
      throw error;
    }
  }

  async getUserCount() {
    try {
      return await this.User.count();
    } catch (error) {
      console.error('Error en getUserCount:', error.message);
      return 0;
    }
  }

  // ================= MÉTODOS DE RESEÑAS =================
  async getReviewById(id) {
    try {
      return await this.Review.findByPk(id);
    } catch (error) {
      console.error('Error en getReviewById:', error.message);
      return null;
    }
  }

  async getAllReviews() {
    try {
      return await this.Review.findAll({
        include: [{
          model: this.User,
          attributes: ['id', 'username']
        }],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('Error en getAllReviews:', error.message);
      return [];
    }
  }

  async getFeaturedReviews() {
    try {
      return await this.Review.findAll({
        where: { is_featured: true },
        include: [{
          model: this.User,
          attributes: ['id', 'username']
        }],
        order: [['created_at', 'DESC']],
        limit: 5
      });
    } catch (error) {
      console.error('Error en getFeaturedReviews:', error.message);
      return [];
    }
  }

  async createReview(reviewData) {
    try {
      return await this.Review.create(reviewData);
    } catch (error) {
      console.error('Error en createReview:', error.message);
      throw error;
    }
  }

  async updateReview(id, reviewData) {
    try {
      const review = await this.Review.findByPk(id);
      if (!review) throw new Error('Reseña no encontrada');
      return await review.update(reviewData);
    } catch (error) {
      console.error('Error en updateReview:', error.message);
      throw error;
    }
  }

  async deleteReview(id) {
    try {
      const review = await this.Review.findByPk(id);
      if (!review) throw new Error('Reseña no encontrada');
      return await review.destroy();
    } catch (error) {
      console.error('Error en deleteReview:', error.message);
      throw error;
    }
  }

  // ================= MÉTODOS DE PELÍCULAS =================
  async getMovieById(id) {
    try {
      return await this.Movie.findByPk(id);
    } catch (error) {
      console.error('Error en getMovieById:', error.message);
      return null;
    }
  }

  async getAllMovies() {
    try {
      return await this.Movie.findAll({
        where: { is_active: true },
        order: [['title', 'ASC']]
      });
    } catch (error) {
      console.error('Error en getAllMovies:', error.message);
      return [];
    }
  }

  async createMovie(movieData) {
    try {
      return await this.Movie.create(movieData);
    } catch (error) {
      console.error('Error en createMovie:', error.message);
      throw error;
    }
  }

  async updateMovie(id, movieData) {
    try {
      const movie = await this.Movie.findByPk(id);
      if (!movie) throw new Error('Película no encontrada');
      return await movie.update(movieData);
    } catch (error) {
      console.error('Error en updateMovie:', error.message);
      throw error;
    }
  }

  async deleteMovie(id) {
    try {
      const movie = await this.Movie.findByPk(id);
      if (!movie) throw new Error('Película no encontrada');
      return await movie.update({ is_active: false });
    } catch (error) {
      console.error('Error en deleteMovie:', error.message);
      throw error;
    }
  }

  async activateMovie(id) {
    try {
      const movie = await this.Movie.findByPk(id);
      if (!movie) throw new Error('Película no encontrada');
      return await movie.update({ is_active: true });
    } catch (error) {
      console.error('Error en activateMovie:', error.message);
      throw error;
    }
  }

  // ================= MÉTODOS DE SERIES =================
  async getSeriesById(id) {
    try {
      return await this.Series.findByPk(id);
    } catch (error) {
      console.error('Error en getSeriesById:', error.message);
      return null;
    }
  }

  async getAllSeries() {
    try {
      return await this.Series.findAll({
        where: { is_active: true },
        order: [['title', 'ASC']]
      });
    } catch (error) {
      console.error('Error en getAllSeries:', error.message);
      return [];
    }
  }

  async createSeries(seriesData) {
    try {
      return await this.Series.create(seriesData);
    } catch (error) {
      console.error('Error en createSeries:', error.message);
      throw error;
    }
  }

  async updateSeries(id, seriesData) {
    try {
      const series = await this.Series.findByPk(id);
      if (!series) throw new Error('Serie no encontrada');
      return await series.update(seriesData);
    } catch (error) {
      console.error('Error en updateSeries:', error.message);
      throw error;
    }
  }

  async deleteSeries(id) {
    try {
      const series = await this.Series.findByPk(id);
      if (!series) throw new Error('Serie no encontrada');
      return await series.update({ is_active: false });
    } catch (error) {
      console.error('Error en deleteSeries:', error.message);
      throw error;
    }
  }

  async activateSeries(id) {
    try {
      const series = await this.Series.findByPk(id);
      if (!series) throw new Error('Serie no encontrada');
      return await series.update({ is_active: true });
    } catch (error) {
      console.error('Error en activateSeries:', error.message);
      throw error;
    }
  }

  // ================= DATOS DE PRUEBA =================
  async ensureTestUsers() {
  try {
    const bcrypt = require('bcryptjs');
    
    console.log('🔍 Verificando usuarios de prueba...');
    
    let adminCreated = false;
    let userCreated = false;

    // Verificar admin
    const existingAdmin = await this.User.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      console.log('👑 Creando usuario admin...');
      
      // ✅ ENVIAR CONTRASEÑA EN TEXTO PLANO - el hook la hasheará
      await this.User.create({
        username: 'admin',
        email: 'admin@cinecriticas.com',
        password_hash: 'admin123', // TEXTO PLANO - el hook lo hasheará
        role: 'admin'
      });
      adminCreated = true;
      console.log('✅ Usuario admin creado');
    } else {
      console.log('✅ Usuario admin ya existe');
    }

    // Verificar usuario normal
    const existingUser = await this.User.findOne({ where: { username: 'usuario' } });
    if (!existingUser) {
      console.log('👤 Creando usuario normal...');
      
      // ✅ ENVIAR CONTRASEÑA EN TEXTO PLANO - el hook la hasheará
      await this.User.create({
        username: 'usuario',
        email: 'usuario@cinecriticas.com',
        password_hash: 'password123', // TEXTO PLANO - el hook lo hasheará
        role: 'user'
      });
      userCreated = true;
      console.log('✅ Usuario normal creado');
    } else {
      console.log('✅ Usuario normal ya existe');
    }

    console.log('🔐 Credenciales configuradas:');
    console.log('   admin / admin123');
    console.log('   usuario / password123');
    
    return { adminCreated, userCreated };
  } catch (error) {
    console.error('❌ Error en ensureTestUsers:', error.message);
    return { adminCreated: false, userCreated: false };
  }
}

  async getDebugInfo() {
    try {
      const usersCount = await this.User.count();
      const reviewsCount = await this.Review.count();
      const moviesCount = await this.Movie.count();
      const seriesCount = await this.Series.count();

      return {
        database: {
          usersCount,
          reviewsCount,
          moviesCount,
          seriesCount,
          dialect: 'SQLite with Sequelize'
        }
      };
    } catch (error) {
      console.error('❌ Error en getDebugInfo:', error.message);
      return {
        database: {
          usersCount: 0,
          reviewsCount: 0,
          moviesCount: 0,
          seriesCount: 0,
          dialect: 'SQLite with Sequelize',
          error: error.message
        }
      };
    }
  }

  async getAllContent() {
    try {
      const movies = await this.getAllMovies();
      const series = await this.getAllSeries();
      return { movies, series };
    } catch (error) {
      console.error('Error en getAllContent:', error.message);
      return { movies: [], series: [] };
    }
  }
}

// Exportar una INSTANCIA de la clase
module.exports = new DatabaseService();