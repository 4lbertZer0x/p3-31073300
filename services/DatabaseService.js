// services/DatabaseService.js - VERSIÓN COMPLETAMENTE CORREGIDA
class DatabaseService {
  constructor() {
    this.initialized = false;
    try {
      const models = require('../models');
      
      this.User = models.User;
      this.Review = models.Review;
      this.Movie = models.Movie;
      this.Category = models.Category;
      this.Tag = models.Tag;
      this.Product = models.Product;
      this.Series = models.Series;
      this.initializeDatabase = models.initializeDatabase;
      this.sequelize = models.sequelize;
      
      console.log('✅ DatabaseService construido - Modelos cargados');
    } catch (error) {
      console.error('❌ Error cargando modelos:', error.message);
      this.initialized = false;
    }
  }

  async initialize() {
    try {
      if (this.initialized) {
        console.log('✅ DatabaseService ya está inicializado');
        return true;
      }

      console.log('🔄 Inicializando DatabaseService...');
      
      if (!this.initializeDatabase) {
        throw new Error('initializeDatabase no está disponible');
      }

      const success = await this.initializeDatabase();
      
      if (success) {
        this.initialized = true;
        console.log('✅ DatabaseService inicializado correctamente');
      } else {
        throw new Error('Falló la inicialización de la base de datos');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error inicializando DatabaseService:', error.message);
      this.initialized = false;
      return false;
    }
  }

  async ensureDatabase() {
    if (!this.initialized) {
      return await this.initialize();
    }
    return true;
  }

  // ================= MÉTODOS DE USUARIOS =================
  async getUserByUsername(username) {
    try {
      await this.ensureDatabase();
      console.log(`🔍 Buscando usuario por username o email: ${username}`);
      const { Op } = require('sequelize');
      const user = await this.User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } });
      console.log(`✅ Usuario ${username} encontrado:`, !!user);
      return user;
    } catch (error) {
      console.error('Error en getUserByUsername:', error.message);
      return null;
    }
  }

  async getUserById(id) {
    try {
      await this.ensureDatabase();
      return await this.User.findByPk(id);
    } catch (error) {
      console.error('Error en getUserById:', error.message);
      return null;
    }
  }

  async getAllUsers() {
    try {
      await this.ensureDatabase();
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
      
      const bcrypt = require('bcryptjs');
      const payload = { ...userData };
      
      // ✅ CORREGIDO: Siempre hashear la contraseña si no es un hash bcrypt
      if (payload.password_hash && !payload.password_hash.startsWith('$2')) {
        console.log('🔄 Hasheando contraseña en texto plano...');
        payload.password_hash = await bcrypt.hash(payload.password_hash, 10);
      }
      
      // Manejar campo password alternativo
      if (!payload.password_hash && payload.password) {
        console.log('🔄 Hasheando contraseña del campo "password"...');
        payload.password_hash = await bcrypt.hash(payload.password, 10);
        delete payload.password;
      }

      // Basic validation
      if (!payload.username || !payload.email || !payload.password_hash) {
        throw new Error('username, email y password_hash son requeridos');
      }

      const user = await this.User.create(payload);
      console.log('✅ Usuario creado:', user.username);
      return user;
    } catch (error) {
      console.error('Error en createUser:', error.message);
      if (error.errors && Array.isArray(error.errors)) {
        console.error('Sequelize validation errors:');
        for (const e of error.errors) {
          console.error('-', e.message, e.path, e.value);
        }
      }
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(id);
      if (!user) throw new Error('Usuario no encontrado');
      return await user.update(userData);
    } catch (error) {
      console.error('Error en updateUser:', error.message);
      throw error;
    }
  }

  // ================= MÉTODOS DE PERFIL DE USUARIO =================
  async updateUserProfile(userId, profileData) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(userId);
      if (!user) throw new Error('Usuario no encontrado');
      
      const allowedFields = ['full_name', 'email', 'membership_type', 'membership_expires', 'purchase_history'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (profileData[field] !== undefined) {
          updateData[field] = profileData[field];
        }
      });
      
      if (profileData.new_password && profileData.current_password) {
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(profileData.current_password, user.password_hash);
        if (!isValidPassword) {
          throw new Error('Contraseña actual incorrecta');
        }
        updateData.password_hash = profileData.new_password;
      }
      
      const updatedUser = await user.update(updateData);
      
      const userResponse = updatedUser.toJSON();
      delete userResponse.password_hash;
      
      return userResponse;
    } catch (error) {
      console.error('Error en updateUserProfile:', error.message);
      throw error;
    }
  }

  async addPurchaseToHistory(userId, purchaseData) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(userId);
      if (!user) throw new Error('Usuario no encontrado');
      
      const currentHistory = user.purchase_history || [];
      const newPurchase = {
        id: Date.now(),
        ...purchaseData,
        date: new Date().toISOString()
      };
      
      currentHistory.push(newPurchase);
      await user.update({ purchase_history: currentHistory });
      
      return newPurchase;
    } catch (error) {
      console.error('Error en addPurchaseToHistory:', error.message);
      throw error;
    }
  }

  async updateMembership(userId, membershipType, durationDays = 30) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(userId);
      if (!user) throw new Error('Usuario no encontrado');
      
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + durationDays);
      
      const updatedUser = await user.update({
        membership_type: membershipType,
        membership_expires: expiresDate
      });
      
      await this.addPurchaseToHistory(userId, {
        type: 'membership',
        plan: membershipType,
        price: membershipType === 'premium' ? 4.99 : 9.99,
        duration_days: durationDays
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Error en updateMembership:', error.message);
      throw error;
    }
  }

  async getUserWithProfile(userId) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] }
      });
      
      if (!user) throw new Error('Usuario no encontrado');
      
      const userReviews = await this.Review.findAll({
        where: { user_id: userId },
        include: [{
          model: this.Movie,
          as: 'movie',
          attributes: ['id', 'title', 'poster_image']
        }],
        order: [['created_at', 'DESC']]
      });
      
      return {
        user: user.toJSON(),
        reviews: userReviews,
        stats: {
          totalReviews: userReviews.length,
          membershipStatus: user.membership_type,
          membershipExpires: user.membership_expires,
          totalPurchases: (user.purchase_history || []).length
        }
      };
    } catch (error) {
      console.error('Error en getUserWithProfile:', error.message);
      throw error;
    }
  }

  async getUserProfileStats(userId) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(userId);
      if (!user) throw new Error('Usuario no encontrado');
      
      const reviewsCount = await this.Review.count({ where: { user_id: userId } });
      const purchases = user.purchase_history || [];
      
      return {
        reviewsCount,
        membershipType: user.membership_type || 'free',
        membershipExpires: user.membership_expires,
        totalPurchases: purchases.length,
        totalSpent: purchases.reduce((total, purchase) => total + (purchase.price || 0), 0)
      };
    } catch (error) {
      console.error('Error en getUserProfileStats:', error.message);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      await this.ensureDatabase();
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
      await this.ensureDatabase();
      return await this.User.count();
    } catch (error) {
      console.error('Error en getUserCount:', error.message);
      return 0;
    }
  }

  // ================= MÉTODOS DE RESEÑAS =================
  async getReviewById(id) {
    try {
      await this.ensureDatabase();
      return await this.Review.findByPk(id);
    } catch (error) {
      console.error('Error en getReviewById:', error.message);
      return null;
    }
  }

  async getAllReviews() {
    try {
      await this.ensureDatabase();
      return await this.Review.findAll({
        include: [{
          model: this.User,
          as: 'user',
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
      await this.ensureDatabase();
      return await this.Review.findAll({
        where: { is_featured: true },
        include: [{
          model: this.User,
          as: 'user',
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
      await this.ensureDatabase();
      return await this.Review.create(reviewData);
    } catch (error) {
      console.error('Error en createReview:', error.message);
      throw error;
    }
  }

  async updateReview(id, reviewData) {
    try {
      await this.ensureDatabase();
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
      await this.ensureDatabase();
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
      await this.ensureDatabase();
      
      if (!this.Movie) {
        throw new Error('Modelo Movie no disponible');
      }

      const movie = await this.Movie.findByPk(id);
      
      let product = null;
      if (movie && this.Product) {
        try {
          product = await this.Product.findOne({ where: { movie_id: id } });
        } catch (error) {
          console.log('ℹ️ No se pudo verificar producto asociado');
        }
      }

      return {
        movie,
        hasProduct: !!product
      };
    } catch (error) {
      console.error('❌ Error en getMovieById:', error.message);
      return { movie: null, hasProduct: false };
    }
  }

  async getAllMovies() {
    try {
      await this.ensureDatabase();
      return await this.Movie.findAll({
        where: { is_active: true },
        order: [['title', 'ASC']]
      });
    } catch (error) {
      console.error('Error en getAllMovies:', error.message);
      return [];
    }
  }

  // ✅ MÉTODO CORREGIDO: createMovie con manejo completo de campos
  async createMovie(movieData) {
    try {
      await this.ensureDatabase();
      
      // ✅ CORREGIDO: Incluir todos los campos necesarios
      const moviePayload = {
        title: movieData.title,
        description: movieData.description || '',
        release_year: movieData.release_year || movieData.year || null,
        director: movieData.director || '',
        duration: movieData.duration || null,
        poster_image: movieData.poster_image || '',
        trailer_url: movieData.trailer_url || '',
        price: movieData.price ? parseFloat(movieData.price) : null,
        is_active: true
      };

      const movie = await this.Movie.create(moviePayload);
      console.log('✅ Película creada:', movie.title);

      // Manejar producto asociado
      await this._handleProductAssociation(movie.id, movieData, false);

      return movie;
    } catch (error) {
      console.error('Error en createMovie:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO CORREGIDO: updateMovie con manejo completo de campos
  async updateMovie(id, movieData) {
    try {
      await this.ensureDatabase();
      
      if (!this.Movie) {
        throw new Error('Modelo Movie no disponible');
      }

      const movie = await this.Movie.findByPk(id);
      if (!movie) {
        throw new Error('Película no encontrada');
      }

      // ✅ CORREGIDO: Mapear campos correctamente
      const updatePayload = {};
      
      if (movieData.title !== undefined) updatePayload.title = movieData.title;
      if (movieData.description !== undefined) updatePayload.description = movieData.description;
      if (movieData.release_year !== undefined) updatePayload.release_year = movieData.release_year;
      if (movieData.year !== undefined) updatePayload.release_year = movieData.year;
      if (movieData.director !== undefined) updatePayload.director = movieData.director;
      if (movieData.duration !== undefined) updatePayload.duration = movieData.duration;
      if (movieData.poster_image !== undefined) updatePayload.poster_image = movieData.poster_image;
      if (movieData.trailer_url !== undefined) updatePayload.trailer_url = movieData.trailer_url;
      if (movieData.price !== undefined) updatePayload.price = movieData.price ? parseFloat(movieData.price) : null;
      if (movieData.is_active !== undefined) updatePayload.is_active = movieData.is_active;

      const updatedMovie = await movie.update(updatePayload);

      // Manejar producto asociado
      await this._handleProductAssociation(id, movieData, true);

      return updatedMovie;
    } catch (error) {
      console.error('❌ Error en updateMovie:', error.message);
      throw error;
    }
  }

  async deleteMovie(id) {
    try {
      await this.ensureDatabase();
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
      await this.ensureDatabase();
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
      await this.ensureDatabase();
      return await this.Series.findByPk(id);
    } catch (error) {
      console.error('Error en getSeriesById:', error.message);
      return null;
    }
  }

  async getAllSeries() {
    try {
      await this.ensureDatabase();
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
      await this.ensureDatabase();
      return await this.Series.create(seriesData);
    } catch (error) {
      console.error('Error en createSeries:', error.message);
      throw error;
    }
  }

  async updateSeries(id, seriesData) {
    try {
      await this.ensureDatabase();
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
      await this.ensureDatabase();
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
      await this.ensureDatabase();
      const series = await this.Series.findByPk(id);
      if (!series) throw new Error('Serie no encontrada');
      return await series.update({ is_active: true });
    } catch (error) {
      console.error('Error en activateSeries:', error.message);
      throw error;
    }
  }

  // ================= MÉTODOS AUXILIARES PARA PRODUCTOS =================
  
  // ✅ MÉTODO NUEVO: Manejar asociación de productos
  async _handleProductAssociation(movieId, movieData, isUpdate = false) {
    try {
      if (!this.Product) {
        console.log('ℹ️ Modelo Product no disponible');
        return;
      }

      if (movieData.price !== undefined && movieData.price !== null) {
        let product = await this.Product.findOne({ 
          where: { movie_id: movieId } 
        });

        if (product) {
          // Actualizar producto existente
          await product.update({
            name: movieData.title || product.name,
            price: parseFloat(movieData.price),
            description: movieData.description || product.description
          });
          console.log('📦 Producto actualizado para película', movieId);
        } else {
          // Crear nuevo producto
          await this.Product.create({
            name: movieData.title || 'Producto sin nombre',
            price: parseFloat(movieData.price),
            description: movieData.description || '',
            movie_id: movieId,
            type: 'movie',
            is_active: true
          });
          console.log('📦 Nuevo producto creado para película', movieId);
        }
      }
    } catch (error) {
      console.error('❌ Error en _handleProductAssociation:', error.message);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  // ✅ MÉTODO NUEVO: Obtener producto para película
  async _getProductForMovie(movieId) {
    try {
      if (!this.Product) return null;
      
      return await this.Product.findOne({ 
        where: { movie_id: movieId } 
      });
    } catch (error) {
      console.log('ℹ️ No se pudo verificar producto asociado:', error.message);
      return null;
    }
  }

  // ================= DATOS DE PRUEBA =================
  async ensureTestUsers() {
    try {
      await this.ensureDatabase();
      const bcrypt = require('bcryptjs');
      
      console.log('🔍 Verificando usuarios de prueba...');
      
      let adminCreated = false;
      let userCreated = false;

      const existingAdmin = await this.User.findOne({ where: { username: 'admin' } });
      if (!existingAdmin) {
        console.log('👑 Creando usuario admin...');
        
        // ✅ CORREGIDO: Hashear la contraseña correctamente
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        
        await this.User.create({
          username: 'admin',
          email: 'admin@cinecriticas.com',
          password_hash: adminPasswordHash,
          role: 'admin',
          full_name: 'Administrador Principal',
          membership_type: 'vip',
          membership_expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          purchase_history: [
            {
              id: 1,
              type: 'membership',
              plan: 'vip',
              price: 9.99,
              date: new Date().toISOString(),
              status: 'completed'
            }
          ]
        });
        adminCreated = true;
        console.log('✅ Usuario admin creado con contraseña hasheada');
      } else {
        console.log('✅ Usuario admin ya existe');
        // ✅ Si ya existe pero tiene contraseña en texto plano, actualízala
        if (existingAdmin.password_hash && !existingAdmin.password_hash.startsWith('$2')) {
          console.log('🔄 Actualizando contraseña del admin a formato bcrypt...');
          const adminPasswordHash = await bcrypt.hash('admin123', 10);
          await existingAdmin.update({ password_hash: adminPasswordHash });
          console.log('✅ Contraseña del admin actualizada');
        }
      }

      const existingUser = await this.User.findOne({ where: { username: 'usuario' } });
      if (!existingUser) {
        console.log('👤 Creando usuario normal...');
        
        // ✅ CORREGIDO: Hashear la contraseña correctamente
        const userPasswordHash = await bcrypt.hash('password123', 10);
        
        await this.User.create({
          username: 'usuario',
          email: 'usuario@cinecriticas.com',
          password_hash: userPasswordHash,
          role: 'user',
          full_name: 'Usuario de Prueba',
          membership_type: 'free',
          purchase_history: []
        });
        userCreated = true;
        console.log('✅ Usuario normal creado con contraseña hasheada');
      } else {
        console.log('✅ Usuario normal ya existe');
        // ✅ Si ya existe pero tiene contraseña en texto plano, actualízala
        if (existingUser.password_hash && !existingUser.password_hash.startsWith('$2')) {
          console.log('🔄 Actualizando contraseña del usuario a formato bcrypt...');
          const userPasswordHash = await bcrypt.hash('password123', 10);
          await existingUser.update({ password_hash: userPasswordHash });
          console.log('✅ Contraseña del usuario actualizada');
        }
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
      await this.ensureDatabase();
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
          dialect: 'SQLite with Sequelize',
          initialized: this.initialized
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
          error: error.message,
          initialized: this.initialized
        }
      };
    }
  }

  async getAllContent() {
    try {
      await this.ensureDatabase();
      const movies = await this.getAllMovies();
      const series = await this.getAllSeries();
      return { movies, series };
    } catch (error) {
      console.error('Error en getAllContent:', error.message);
      return { movies: [], series: [] };
    }
  }
}

module.exports = new DatabaseService();