// controllers/profileController.js
const DatabaseService = require('../services/DatabaseService');

class ProfileController {
  
  // Mostrar perfil de usuario
  static async showProfile(req, res) {
    try {
      const userId = req.session.user.id;
      
      // Obtener usuario con información básica
      const user = await DatabaseService.User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).render('error', {
          title: 'Usuario no encontrado',
          message: 'El usuario no existe.',
          user: req.session.user
        });
      }

      // Obtener reseñas del usuario SIN usar asociaciones
      const reviews = await DatabaseService.Review.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      // Obtener información de películas para las reseñas
      const reviewsWithMovies = await Promise.all(
        reviews.map(async (review) => {
          let movieData = { title: 'Película no encontrada', poster_image: null };
          
          if (review.movie_id) {
            try {
              const movie = await DatabaseService.Movie.findByPk(review.movie_id);
              if (movie) {
                movieData = {
                  title: movie.title,
                  poster_image: movie.poster_image
                };
              }
            } catch (error) {
              console.warn(`No se pudo cargar película para review ${review.id}:`, error.message);
            }
          }
          
          return {
            ...review.toJSON(),
            Movie: movieData
          };
        })
      );

      // Calcular estadísticas básicas
      const reviewCount = await DatabaseService.Review.count({
        where: { user_id: userId }
      });

      const stats = {
        review_count: reviewCount,
        member_since: new Date(user.created_at).getFullYear(),
        membership_level: user.role || 'user'
      };

      res.render('user/profile', {
        title: 'Mi Perfil - CineCríticas',
        user: user,
        reviews: reviewsWithMovies,
        stats: stats,
        currentPath: '/user/profile'
      });
    } catch (error) {
      console.error('Error cargando perfil:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar el perfil',
        user: req.session.user
      });
    }
  }

  // Actualizar información personal (API)
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { username, email, bio } = req.body;

      const user = await DatabaseService.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar si el username o email ya existen (excluyendo el usuario actual)
      if (username && username !== user.username) {
        const existingUser = await DatabaseService.User.findOne({ 
          where: { username } 
        });
        if (existingUser) {
          return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
        }
      }

      if (email && email !== user.email) {
        const existingEmail = await DatabaseService.User.findOne({ 
          where: { email } 
        });
        if (existingEmail) {
          return res.status(400).json({ error: 'El email ya está en uso' });
        }
      }

      // Actualizar usuario
      await user.update({
        username: username || user.username,
        email: email || user.email,
        bio: bio !== undefined ? bio : user.bio
      });

      // Actualizar sesión si el username cambió
      if (username && req.session.user) {
        req.session.user.username = username;
      }

      res.json({ 
        success: true,
        message: 'Perfil actualizado correctamente',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error al actualizar el perfil' 
      });
    }
  }

  // Historial de compras
  static async purchaseHistory(req, res) {
    try {
      // Por ahora, mostrar página básica ya que el sistema de compras puede no estar implementado
      res.render('user/purchase-history', {
        title: 'Mi Historial de Compras - CineCríticas',
        user: req.session.user,
        purchases: [],
        currentPath: '/user/purchase-history'
      });
    } catch (error) {
      console.error('Error cargando historial:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar el historial de compras',
        user: req.session.user
      });
    }
  }

  // Mis reseñas
  static async myReviews(req, res) {
    try {
      const userId = req.session.user.id;
      
      // Obtener reseñas sin usar asociaciones
      const reviews = await DatabaseService.Review.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      // Enriquecer reseñas con información de películas
      const reviewsWithMovies = await Promise.all(
        reviews.map(async (review) => {
          let movieData = { title: 'Película no encontrada', year: null, poster_image: null };
          
          if (review.movie_id) {
            try {
              const movie = await DatabaseService.Movie.findByPk(review.movie_id);
              if (movie) {
                movieData = {
                  title: movie.title,
                  year: movie.year,
                  poster_image: movie.poster_image
                };
              }
            } catch (error) {
              console.warn(`No se pudo cargar película para review ${review.id}:`, error.message);
            }
          }
          
          return {
            ...review.toJSON(),
            Movie: movieData
          };
        })
      );

      res.render('user/my-reviews', {
        title: 'Mis Reseñas - CineCríticas',
        reviews: reviewsWithMovies,
        user: req.session.user,
        currentPath: '/user/my-reviews'
      });
    } catch (error) {
      console.error('Error cargando reseñas:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar tus reseñas',
        user: req.session.user
      });
    }
  }

  // Membresías
  static async membership(req, res) {
    try {
      const membershipPlans = [
        {
          id: 'premium',
          name: 'Premium Mensual',
          price: 4.99,
          features: [
            'Acceso a contenido exclusivo',
            'Reseñas tempranas de películas',
            'Sin anuncios publicitarios',
            'Badge especial en tu perfil'
          ],
          duration: 30
        },
        {
          id: 'vip',
          name: 'VIP Mensual',
          price: 9.99,
          features: [
            'Todos los beneficios Premium',
            'Acceso a eventos exclusivos',
            'Descuentos en productos',
            'Soporte prioritario',
            'Podés influir en contenido futuro'
          ],
          duration: 30
        }
      ];
      
      res.render('user/membership', {
        title: 'Membresías - CineCríticas',
        user: req.session.user,
        plans: membershipPlans,
        currentPath: '/user/membership'
      });
    } catch (error) {
      console.error('Error cargando membresías:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar las membresías',
        user: req.session.user
      });
    }
  }

  // Procesar compra de membresía (API)
  static async purchaseMembership(req, res) {
    try {
      const { plan_id } = req.body;
      const userId = req.user.id;
      
      // Por ahora, solo simular la compra ya que el sistema de membresías puede no estar implementado
      // En una implementación real, aquí procesarías el pago y actualizarías la base de datos
      
      res.json({
        success: true,
        message: `¡Felicidades! Ahora tienes membresía ${plan_id}`,
        membership: {
          type: plan_id,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días desde ahora
        }
      });
      
    } catch (error) {
      console.error('Error procesando membresía:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error al procesar la compra de membresía' 
      });
    }
  }

  // Obtener estadísticas del perfil (API)
  static async getProfileStats(req, res) {
    try {
      const userId = req.user.id;
      
      // Contar reseñas del usuario
      const reviewCount = await DatabaseService.Review.count({
        where: { user_id: userId }
      });

      // Obtener información del usuario para calcular antigüedad
      const user = await DatabaseService.User.findByPk(userId);
      const memberSince = user ? new Date(user.created_at).getFullYear() : new Date().getFullYear();

      const stats = {
        review_count: reviewCount,
        member_since: memberSince,
        membership_level: user?.role || 'user'
      };

      res.json({ 
        success: true, 
        data: stats 
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener estadísticas del perfil' 
      });
    }
  }
}

module.exports = ProfileController;