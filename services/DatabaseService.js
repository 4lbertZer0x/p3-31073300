class DatabaseService {
async getAllProducts() {
  try {
    await this.ensureDatabase();
    if (!this.Product) {
      console.log('❌ Modelo Product no disponible');
      return [];
    }

    console.log('🛍️ Obteniendo todos los productos...');
    
    // OPCIÓN 1: Obtener productos SIN categorías (para probar)
    const products = await this.Product.findAll({
      order: [['created_at', 'DESC']],
      raw: true // Esto devuelve objetos planos en lugar de instancias de Sequelize
    });
    
    console.log(`✅ Encontrados ${products.length} productos (sin categorías)`);
    
    // OPCIÓN 2: Intentar con el alias correcto (si sabes cuál es)
    // Si no sabes el alias, usa la opción 1 arriba
    
    return products;
  } catch (error) {
    console.error('❌ Error en getAllProducts:', error.message);
    
    // Si hay error con las asociaciones, obtener productos sin incluir categorías
    try {
      console.log('🔄 Intentando obtener productos sin asociaciones...');
      const simpleProducts = await this.Product.findAll({
        order: [['created_at', 'DESC']],
        raw: true
      });
      console.log(`✅ Encontrados ${simpleProducts.length} productos (modo simple)`);
      return simpleProducts;
    } catch (simpleError) {
      console.error('❌ Error incluso en modo simple:', simpleError.message);
      return [];
    }
  }
}
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
      this.Purchase = models.Purchase;
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

  // ================= MÉTODOS NUEVOS PARA HOME CONTROLLER =================

  async getFeaturedReviewsForHome() {
    try {
      await this.ensureDatabase();
      console.log('⭐ Obteniendo reseñas destacadas para home...');
      
      const reviews = await this.Review.findAll({
        where: { 
          is_featured: true,
          is_active: true 
        },
        include: [
          {
            model: this.User,
            as: 'user',
            attributes: ['id', 'username', 'role', 'full_name']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 6
      });
      
      console.log(`✅ ${reviews.length} reseñas destacadas encontradas`);
      return reviews;
    } catch (error) {
      console.error('❌ Error en getFeaturedReviewsForHome:', error.message);
      return [];
    }
  }

  async getRecentReviewsForHome() {
    try {
      await this.ensureDatabase();
      console.log('📝 Obteniendo reseñas recientes para home...');
      
      const reviews = await this.Review.findAll({
        where: { is_active: true },
        include: [
          {
            model: this.User,
            as: 'user',
            attributes: ['id', 'username', 'role', 'full_name']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 12
      });
      
      console.log(`✅ ${reviews.length} reseñas recientes encontradas`);
      return reviews;
    } catch (error) {
      console.error('❌ Error en getRecentReviewsForHome:', error.message);
      return [];
    }
  }

  async checkReviewAssociations() {
    try {
      await this.ensureDatabase();
      console.log('🔍 Verificando asociaciones de Review...');
      
      const sampleReview = await this.Review.findOne({
        include: [
          {
            model: this.User,
            as: 'user',
            attributes: ['id', 'username', 'role']
          }
        ]
      });
      
      if (sampleReview) {
        console.log('✅ Asociación Review -> User funciona correctamente');
        console.log('📝 Review sample:', {
          id: sampleReview.id,
          title: sampleReview.title,
          hasUser: !!sampleReview.user,
          username: sampleReview.user?.username,
          userRole: sampleReview.user?.role
        });
        return true;
      } else {
        console.log('ℹ️ No hay reseñas para verificar asociaciones');
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando asociaciones:', error.message);
      return false;
    }
  }

   async ensureMembershipColumns() {
    try {
      console.log('🔍 Verificando columnas de membresía con Sequelize...');
      
      // Intentar crear un usuario temporal con los campos de membresía
      // Si falla, las columnas no existen
      try {
        const tempUser = await this.User.create({
          username: 'temp_check_' + Date.now(),
          email: 'temp@check.com',
          password_hash: 'temp',
          membership_type: 'free',
          membership_expires: null,
          membership_purchased: null
        });
        
        // Eliminar el usuario temporal
        await tempUser.destroy();
        console.log('✅ Columnas de membresía verificadas');
        return true;
      } catch (error) {
        console.log('⚠️ Columnas de membresía no disponibles:', error.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando columnas:', error.message);
      return false;
    }
  }

  // ✅ NUEVO MÉTODO: Obtener conexión directa a la base de datos
  async getDB() {
    try {
      if (!this.sequelize) {
        throw new Error('Sequelize no está disponible');
      }
      
      // Obtener la conexión directa de Sequelize
      return this.sequelize.connectionManager.getConnection();
    } catch (error) {
      console.error('❌ Error obteniendo conexión a BD:', error.message);
      throw error;
    }
  }

  // ✅ NUEVO MÉTODO: Verificar estado de membresía
  async checkMembershipStatus(userId) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(userId, {
        attributes: ['id', 'membership_type', 'membership_expires', 'membership_purchased']
      });

      if (!user) throw new Error('Usuario no encontrado');

      const userData = user.toJSON ? user.toJSON() : user;
      const now = new Date();
      
      // Verificar si la membresía está activa
      const isActive = userData.membership_type === 'vip' && 
                      userData.membership_expires && 
                      new Date(userData.membership_expires) > now;

      // Calcular días restantes
      let daysRemaining = 0;
      if (isActive) {
        daysRemaining = Math.ceil((new Date(userData.membership_expires) - now) / (1000 * 60 * 60 * 24));
      }

      return {
        membership_type: userData.membership_type || 'free',
        membership_expires: userData.membership_expires,
        membership_purchased: userData.membership_purchased,
        is_active: isActive,
        days_remaining: daysRemaining
      };
    } catch (error) {
      console.error('❌ Error en checkMembershipStatus:', error.message);
      return {
        membership_type: 'free',
        membership_expires: null,
        membership_purchased: null,
        is_active: false,
        days_remaining: 0
      };
    }
  }

  // ✅ NUEVO MÉTODO: Obtener usuario con información de membresía segura
  async getUserWithMembership(userId) {
    try {
      await this.ensureDatabase();
      
      // Consulta segura que maneja columnas faltantes
      const db = await this.getDB();
      const userQuery = `
        SELECT id, username, email, 
               COALESCE(membership_type, 'free') as membership_type,
               membership_expires, membership_purchased
        FROM users WHERE id = ?
      `;
      
      const user = await db.get(userQuery, [userId]);
      
      if (!user) throw new Error('Usuario no encontrado');
      
      return user;
    } catch (error) {
      console.error('❌ Error en getUserWithMembership:', error.message);
      
      // Fallback: usar valores por defecto
      return {
        id: userId,
        username: 'usuario',
        email: 'usuario@example.com',
        membership_type: 'free',
        membership_expires: null,
        membership_purchased: null
      };
    }
  }

  // ================= MÉTODOS DE RESEÑAS (CORREGIDOS) =================
  
  async getReviewsByUserId(userId) {
    try {
      await this.ensureDatabase();
      console.log(`📝 Obteniendo reseñas para usuario: ${userId}`);
      
      const reviews = await this.Review.findAll({
        where: { user_id: userId },
        include: [
          {
            model: this.Movie,
            as: 'movie',
            attributes: ['id', 'title', 'poster_image']
          },
          {
            model: this.User,
            as: 'user',
            attributes: ['id', 'username', 'full_name']
          }
        ],
        order: [['created_at', 'DESC']]
      });
      
      console.log(`✅ Encontradas ${reviews.length} reseñas para usuario ${userId}`);
      return reviews;
    } catch (error) {
      console.error('❌ Error en getReviewsByUserId:', error.message);
      return [];
    }
  }

  async getReviewById(id) {
    try {
      await this.ensureDatabase();
      return await this.Review.findByPk(id, {
        include: [
          {
            model: this.User,
            as: 'user',
            attributes: ['id', 'username', 'full_name']
          },
          {
            model: this.Movie,
            as: 'movie',
            attributes: ['id', 'title', 'poster_image']
          }
        ]
      });
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
          attributes: ['id', 'username', 'full_name']
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
          attributes: ['id', 'username', 'full_name']
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
      console.log('📝 Creando reseña para usuario:', reviewData.user_id);
      
      const review = await this.Review.create(reviewData);
      console.log('✅ Reseña creada ID:', review.id);
      
      return review;
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
      
      console.log('📝 Actualizando reseña ID:', id);
      const updatedReview = await review.update(reviewData);
      console.log('✅ Reseña actualizada ID:', id);
      
      return updatedReview;
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
      
      console.log('🗑️ Eliminando reseña ID:', id);
      await review.destroy();
      console.log('✅ Reseña eliminada ID:', id);
      
      return true;
    } catch (error) {
      console.error('Error en deleteReview:', error.message);
      throw error;
    }
  }

  // ================= MÉTODOS DE COMPRAS (OPTIMIZADOS) =================
  
  async createPurchase(purchaseData) {
    try {
      await this.ensureDatabase();
      console.log('🛒 Creando compra para usuario:', purchaseData.user_id);
      
      const purchase = await this.Purchase.create({
        user_id: purchaseData.user_id,
        type: purchaseData.type || 'movie',
        movie_id: purchaseData.movie_id || null,
        movie_title: purchaseData.movie_title || null,
        plan_type: purchaseData.plan_type || null,
        amount: purchaseData.amount || 0,
        payment_method: purchaseData.payment_method || 'stripe',
        status: purchaseData.status || 'completed',
        transaction_id: purchaseData.transaction_id || `TXN_${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('✅ Compra creada ID:', purchase.id);
      return purchase;
    } catch (error) {
      console.error('❌ Error en createPurchase:', error.message);
      throw error;
    }
  }

  async getMovieByTitle(title) {
    try {
      await this.ensureDatabase();
      console.log(`🔍 Buscando película por título: ${title}`);
      
      const movie = await this.Movie.findOne({ 
        where: { title: title } 
      });
      
      console.log(`✅ Película encontrada:`, movie ? movie.title : 'No encontrada');
      return movie;
    } catch (error) {
      console.error('❌ Error en getMovieByTitle:', error.message);
      return null;
    }
  }

  async recordPurchase(purchaseData) {
    try {
      return await this.createPurchase(purchaseData);
    } catch (error) {
      console.error('❌ Error en recordPurchase:', error.message);
      throw error;
    }
  }

  async getPurchaseById(purchaseId) {
    try {
      await this.ensureDatabase();
      const purchase = await this.Purchase.findByPk(purchaseId);
      return purchase;
    } catch (error) {
      console.error('❌ Error en getPurchaseById:', error.message);
      return null;
    }
  }

  async getUserPurchases(userId) {
    try {
      await this.ensureDatabase();
      console.log('📋 Obteniendo compras del usuario:', userId);
      
      const purchases = await this.Purchase.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });
      
      console.log(`✅ Encontradas ${purchases.length} compras para usuario ${userId}`);
      return purchases;
    } catch (error) {
      console.error('❌ Error en getUserPurchases:', error.message);
      return [];
    }
  }

  async updatePurchaseStatus(id, status, transactionId = null) {
    try {
      await this.ensureDatabase();
      const purchase = await this.Purchase.findByPk(id);
      if (!purchase) throw new Error('Compra no encontrada');
      
      const updateData = { 
        status,
        updated_at: new Date()
      };
      if (transactionId) updateData.transaction_id = transactionId;
      
      return await purchase.update(updateData);
    } catch (error) {
      console.error('❌ Error en updatePurchaseStatus:', error.message);
      throw error;
    }
  }

  async processMoviePurchase(userId, movieData, paymentData) {
    try {
      await this.ensureDatabase();
      
      const purchaseData = {
        user_id: userId,
        type: 'movie',
        movie_id: movieData.id,
        movie_title: movieData.title,
        amount: movieData.price || 3.99,
        status: 'completed',
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id || `TXN_${Date.now()}`
      };
      
      const purchase = await this.createPurchase(purchaseData);
      
      await this.addPurchaseToHistory(userId, {
        type: 'movie',
        movie_title: movieData.title,
        price: movieData.price || 3.99,
        status: 'completed',
        transaction_id: purchaseData.transaction_id
      });
      
      return purchase;
    } catch (error) {
      console.error('❌ Error en processMoviePurchase:', error.message);
      throw error;
    }
  }

  // ✅ ACTUALIZADO: Procesar compra de membresía con manejo de fechas
  async processMembershipPurchase(userId, planType, paymentData, durationDays = 30) {
    try {
      await this.ensureDatabase();
      
      // Validar que el plan sea VIP (único plan de pago disponible)
      if (planType !== 'vip') {
        throw new Error('Solo está disponible el plan VIP');
      }

      const planPrices = {
        'vip': 9.99
      };
      
      const amount = planPrices[planType] || 9.99;
      
      const purchaseData = {
        user_id: userId,
        type: 'membership',
        plan_type: planType,
        amount: amount,
        status: 'completed',
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id || `MEM_VIP_${Date.now()}_${userId}`
      };
      
      const purchase = await this.createPurchase(purchaseData);
      
      // ✅ ACTUALIZADO: Actualizar membresía con fecha de compra
      await this.updateMembership(userId, planType, durationDays);
      
      return {
        ...purchase.toJSON(),
        membership_expires: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      console.error('❌ Error en processMembershipPurchase:', error.message);
      throw error;
    }
  }

  async getPurchaseStats(userId) {
    try {
      await this.ensureDatabase();
      
      const purchases = await this.getUserPurchases(userId);
      const totalSpent = purchases.reduce((total, purchase) => 
        total + parseFloat(purchase.amount || 0), 0
      );
      
      const moviePurchases = purchases.filter(p => p.type === 'movie').length;
      const membershipPurchases = purchases.filter(p => p.type === 'membership').length;
      const completedPurchases = purchases.filter(p => p.status === 'completed').length;
      
      return {
        totalPurchases: purchases.length,
        totalSpent: totalSpent.toFixed(2),
        moviePurchases,
        membershipPurchases,
        completedPurchases,
        pendingPurchases: purchases.length - completedPurchases
      };
    } catch (error) {
      console.error('❌ Error en getPurchaseStats:', error.message);
      return {
        totalPurchases: 0,
        totalSpent: '0.00',
        moviePurchases: 0,
        membershipPurchases: 0,
        completedPurchases: 0,
        pendingPurchases: 0
      };
    }
  }

  // ================= MÉTODOS DE USUARIOS (CORREGIDOS) =================
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
      const user = await this.User.findByPk(id);
      return user;
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
      
      if (payload.password_hash && !payload.password_hash.startsWith('$2')) {
        console.log('🔄 Hasheando contraseña en texto plano...');
        payload.password_hash = await bcrypt.hash(payload.password_hash, 10);
      }
      
      if (!payload.password_hash && payload.password) {
        console.log('🔄 Hasheando contraseña del campo "password"...');
        payload.password_hash = await bcrypt.hash(payload.password, 10);
        delete payload.password;
      }

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
      
      console.log('👤 Actualizando usuario ID:', id);
      const updatedUser = await user.update(userData);
      console.log('✅ Usuario actualizado ID:', id);
      
      return updatedUser;
    } catch (error) {
      console.error('Error en updateUser:', error.message);
      throw error;
    }
  }

  // ================= MÉTODOS DE PERFIL DE USUARIO (CORREGIDOS) =================
  async updateUserProfile(userId, profileData) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(userId);
      if (!user) throw new Error('Usuario no encontrado');
      
      console.log('👤 Actualizando perfil para usuario:', userId);
      
      const allowedFields = ['full_name', 'email'];
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
        updateData.password_hash = await bcrypt.hash(profileData.new_password, 10);
      }
      
      const updatedUser = await user.update(updateData);
      
      const userResponse = updatedUser.toJSON();
      delete userResponse.password_hash;
      
      console.log('✅ Perfil actualizado para usuario:', userId);
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

  // ✅ ACTUALIZADO: Actualizar membresía con fecha de compra
  async updateMembership(userId, membershipType, durationDays = 30) {
    try {
      await this.ensureDatabase();
      const user = await this.User.findByPk(userId);
      if (!user) throw new Error('Usuario no encontrado');
      
      const now = new Date();
      const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      
      const updatedUser = await user.update({
        membership_type: membershipType,
        membership_expires: expiresDate,
        membership_purchased: now
      });
      
      // Agregar al historial de compras
      await this.addPurchaseToHistory(userId, {
        type: 'membership',
        plan: membershipType,
        price: membershipType === 'vip' ? 9.99 : 0,
        duration_days: durationDays,
        status: 'completed',
        date: now.toISOString()
      });
      
      return updatedUser;
    } catch (error) {
      console.error('❌ Error en updateMembership:', error.message);
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
      
      const userReviews = await this.getReviewsByUserId(userId);
      const userPurchases = await this.getUserPurchases(userId);
      
      return {
        user: user.toJSON(),
        reviews: userReviews,
        purchases: userPurchases,
        stats: {
          totalReviews: userReviews.length,
          membershipStatus: user.membership_type,
          membershipExpires: user.membership_expires,
          totalPurchases: userPurchases.length,
          totalSpent: userPurchases.reduce((total, purchase) => 
            total + parseFloat(purchase.amount || 0), 0
          ).toFixed(2)
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
      const purchases = await this.getUserPurchases(userId);
      
      return {
        reviewsCount,
        membershipType: user.membership_type || 'free',
        membershipExpires: user.membership_expires,
        totalPurchases: purchases.length,
        totalSpent: purchases.reduce((total, purchase) => 
          total + parseFloat(purchase.amount || 0), 0
        ).toFixed(2)
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
      
      console.log('🗑️ Eliminando usuario ID:', id);
      await user.destroy();
      console.log('✅ Usuario eliminado ID:', id);
      
      return true;
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

  async createMovie(movieData) {
    try {
      await this.ensureDatabase();
      
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

      await this._handleProductAssociation(movie.id, movieData, false);

      return movie;
    } catch (error) {
      console.error('Error en createMovie:', error.message);
      throw error;
    }
  }

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

  // ================= MÉTODOS AUXILIARES =================
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
          await product.update({
            name: movieData.title || product.name,
            price: parseFloat(movieData.price),
            description: movieData.description || product.description
          });
          console.log('📦 Producto actualizado para película', movieId);
        } else {
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
    }
  }

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
      const purchasesCount = await this.Purchase.count();

      return {
        database: {
          usersCount,
          reviewsCount,
          moviesCount,
          seriesCount,
          purchasesCount,
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
          purchasesCount: 0,
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