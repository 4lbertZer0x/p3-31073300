const DatabaseService = require('../services/DatabaseService');

class PurchaseController {
  
  /**
   * Mostrar página de compra para película
   */
  static async showMoviePurchasePage(req, res) {
    try {
      const movieId = parseInt(req.params.id);
      
      if (isNaN(movieId) || movieId <= 0) {
        return res.redirect('/?error=ID de película inválido');
      }

      console.log(`🛒 Cargando página de compra para película ID: ${movieId}`);
      
      const movie = await DatabaseService.getMovieById(movieId);
      
      if (!movie) {
        return res.redirect('/?error=Película no encontrada');
      }

      // Si la película no tiene precio, usar precio por defecto
      if (!movie.price || movie.price <= 0) {
        movie.price = 3.99;
      }

      res.render('purchase-movie', {
        title: `Comprar ${movie.title} - CineCríticas`,
        movie: movie,
        user: req.session.user,
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
      
    } catch (error) {
      console.error('❌ Error cargando página de compra:', error);
      res.redirect('/?error=Error al cargar página de compra');
    }
  }

  /**
   * Mostrar página de compra desde parámetros de query
   */
  static async showPurchasePage(req, res) {
    try {
      const { movie_id, movie_title, amount } = req.query;
      
      if (!movie_id && !movie_title) {
        return res.redirect('/?error=Datos de compra incompletos');
      }

      let movie = null;
      
      // Buscar película por ID si está disponible
      if (movie_id) {
        const movieId = parseInt(movie_id);
        movie = await DatabaseService.getMovieById(movieId);
      }
      
      // Si no se encontró por ID, buscar por título
      if (!movie && movie_title) {
        movie = await DatabaseService.Movie.findOne({
          where: { title: movie_title }
        });
      }

      if (!movie) {
        return res.redirect('/?error=Película no encontrada');
      }

      // Usar el precio proporcionado o el de la película
      if (amount) {
        movie.price = parseFloat(amount);
      } else if (!movie.price || movie.price <= 0) {
        movie.price = 3.99;
      }

      res.render('purchase-movie', {
        title: `Comprar ${movie.title} - CineCríticas`,
        movie: movie,
        user: req.session.user,
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
      
    } catch (error) {
      console.error('❌ Error cargando página de compra:', error);
      res.redirect('/?error=Error al cargar página de compra');
    }
  }

  /**
   * Procesar compra de película
   */
  static async processMoviePurchase(req, res) {
    try {
      const { movie_id, movie_title, amount, payment_method } = req.body;
      const userId = req.session.user ? req.session.user.id : null;

      console.log('💳 Procesando compra:', {
        movie_id,
        movie_title,
        amount,
        payment_method,
        user_id: userId
      });

      // Validaciones
      if (!userId) {
        return res.redirect('/auth/login?error=Debes iniciar sesión para comprar');
      }

      if (!movie_id && !movie_title) {
        return res.redirect('/?error=Datos de compra incompletos');
      }

      // Buscar la película
      let movie = null;
      if (movie_id) {
        movie = await DatabaseService.getMovieById(parseInt(movie_id));
      }
      
      if (!movie && movie_title) {
        movie = await DatabaseService.Movie.findOne({
          where: { title: movie_title }
        });
      }

      if (!movie) {
        return res.redirect('/?error=Película no encontrada');
      }

      const purchaseAmount = amount ? parseFloat(amount) : (movie.price || 3.99);

      // Usar el modelo Purchase directamente
      const { Purchase } = require('../models');
      
      // Crear registro de compra
      const purchaseData = {
        user_id: userId,
        type: 'movie',
        movie_id: movie.id,
        movie_title: movie.title,
        amount: purchaseAmount,
        payment_method: payment_method || 'card',
        status: 'completed',
        transaction_id: 'txn_' + Date.now()
      };

      console.log('📦 Creando registro de compra:', purchaseData);

      const purchase = await Purchase.create(purchaseData);

      // Actualizar historial de compras del usuario
      await PurchaseController._updateUserPurchaseHistory(userId, purchase);

      console.log(`✅ Compra completada - ID: ${purchase.id}, Usuario: ${userId}, Película: ${movie.title}`);

      // Redirigir a página de éxito
      res.redirect(`/purchase/success/${purchase.id}`);
      
    } catch (error) {
      console.error('❌ Error procesando compra:', error);
      res.redirect('/?error=Error al procesar la compra: ' + error.message);
    }
  }

  /**
   * Página de éxito de compra
   */
  static async showPurchaseSuccess(req, res) {
    try {
      const purchaseId = parseInt(req.params.id);
      
      if (isNaN(purchaseId) || purchaseId <= 0) {
        return res.redirect('/?error=ID de compra inválido');
      }

      // Usar el modelo Purchase directamente
      const { Purchase } = require('../models');
      const purchase = await Purchase.findByPk(purchaseId);
      
      if (!purchase) {
        return res.redirect('/?error=Compra no encontrada');
      }

      // Verificar que el usuario actual es el dueño de la compra
      if (req.session.user && req.session.user.id !== purchase.user_id) {
        return res.redirect('/?error=No tienes permiso para ver esta compra');
      }

      res.render('purchase-success', {
        title: 'Compra Exitosa - CineCríticas',
        purchase: purchase,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('❌ Error cargando página de éxito:', error);
      res.redirect('/?error=Error al cargar página de éxito');
    }
  }

  /**
   * Actualizar historial de compras del usuario
   */
  static async _updateUserPurchaseHistory(userId, purchase) {
    try {
      const { User } = require('../models');
      const user = await User.findByPk(userId);
      
      if (user) {
        let purchaseHistory = [];
        
        try {
          purchaseHistory = user.purchase_history || [];
        } catch (e) {
          purchaseHistory = [];
        }
        
        // Agregar nueva compra al historial
        purchaseHistory.push({
          id: purchase.id,
          type: purchase.type,
          movie_title: purchase.movie_title,
          amount: purchase.amount,
          date: new Date().toISOString(),
          status: purchase.status
        });
        
        // Actualizar usuario
        await user.update({
          purchase_history: purchaseHistory
        });
        
        console.log(`✅ Historial de compras actualizado para usuario ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error actualizando historial de compras:', error);
    }
  }

  /**
   * Obtener compras del usuario
   */
  static async getUserPurchases(req, res) {
    try {
      const userId = req.session.user ? req.session.user.id : null;
      
      if (!userId) {
        return res.redirect('/auth/login?error=Debes iniciar sesión');
      }

      const { Purchase } = require('../models');
      const purchases = await Purchase.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      res.render('user/purchases', {
        title: 'Mis Compras - CineCríticas',
        purchases: purchases,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('❌ Error cargando compras del usuario:', error);
      res.redirect('/?error=Error al cargar tus compras');
    }
  }
}

module.exports = PurchaseController;