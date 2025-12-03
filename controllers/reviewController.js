const DatabaseService = require('../services/DatabaseService');
const path = require('path');
const fs = require('fs');

class ReviewController {
  
  /**
   * @swagger
   * /reviews/new:
   *   get:
   *     summary: Mostrar formulario para nueva reseña
   *     description: Renderiza el formulario para crear una nueva reseña (requiere autenticación)
   *     tags:
   *       - Reviews
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Formulario de reseña renderizado
   *       401:
   *         description: No autenticado
   */
  static async showNewReviewForm(req, res) {
    try {
      const movies = await DatabaseService.getAllMovies();
      const users = await DatabaseService.getAllUsers();
      return res.render('admin-review-form', {
        title: 'Nueva Reseña - Admin',
        user: req.session.user,
        movies: movies || [],
        users: users || [],
        error: null,
        success: null,
        editReview: null
      });
    } catch (error) {
      console.error('Error mostrando formulario de nueva reseña:', error);
      return res.redirect('/admin?error=Error al cargar formulario de reseña');
    }
  }

  // Mostrar formulario para crear reseña (versión usuario)
  static async showNewUserReviewForm(req, res) {
    try {
      const movies = await DatabaseService.getAllMovies();
      
      const moviesWithRequiredProps = movies.map(movie => ({
        id: movie.id,
        title: movie.title,
        year: movie.release_year || movie.year || 'N/A',
        genre: movie.genre || 'Sin género',
        type: movie.type || 'movie',
        ...movie.toJSON ? movie.toJSON() : movie
      }));
      
      res.render('user/new-review', {
        title: 'Crear Nueva Reseña - CineCríticas',
        movies: moviesWithRequiredProps,
        user: req.session.user,
        error: null,
        success: null
      });
    } catch (error) {
      console.error('Error cargando formulario de reseña:', error);
      res.render('user/new-review', {
        title: 'Crear Nueva Reseña - CineCríticas',
        movies: [],
        user: req.session.user,
        error: 'Error al cargar las películas',
        success: null
      });
    }
  }

  // Crear reseña (versión usuario)
  static async createUserReview(req, res) {
    try {
      const userId = req.session.user.id;
      const { movie_title, title, content, rating } = req.body;

      if (!movie_title || !title || !content || !rating) {
        return res.redirect('/reviews/new?error=Todos los campos son obligatorios');
      }

      const movie = await DatabaseService.Movie.findOne({
        where: { 
          title: movie_title,
          is_active: true 
        }
      });

      if (!movie) {
        return res.redirect('/reviews/new?error=Película no encontrada o no disponible');
      }

      const newReview = await DatabaseService.Review.create({
        title: title,
        content: content,
        rating: parseInt(rating),
        user_id: userId,
        movie_id: movie.id,
        movie_title: movie.title,
        is_featured: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log(`✅ Nueva reseña creada por usuario ${userId}: "${title}"`);
      res.redirect(`/review/${newReview.id}?success=Reseña publicada correctamente`);

    } catch (error) {
      console.error('Error creando reseña:', error);
      res.redirect('/reviews/new?error=Error al crear la reseña: ' + error.message);
    }
  }

  // Mostrar mis reseñas (vista usuario)
  static async showMyReviews(req, res) {
    try {
      const userId = req.session.user.id;
      
      const reviews = await DatabaseService.Review.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      const reviewsWithMovies = await Promise.all(
        reviews.map(async (review) => {
          let movieData = { title: 'Película no encontrada', poster_image: null };
          
          if (review.movie_id) {
            try {
              const movie = await DatabaseService.Movie.findByPk(review.movie_id);
              if (movie) {
                movieData = {
                  title: movie.title,
                  poster_image: movie.poster_image,
                  year: movie.year
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
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Error cargando mis reseñas:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar tus reseñas',
        user: req.session.user
      });
    }
  }

  /**
   * @swagger
   * /api/reviews:
   *   get:
   *     summary: Obtener todas las reseñas
   *     description: Retorna la lista completa de reseñas públicas con información de usuarios
   *     tags:
   *       - Reviews
   *     parameters:
   *       - in: query
   *         name: featured
   *         schema:
   *           type: boolean
   *         description: Filtrar solo reseñas destacadas
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *         description: Límite de reseñas a retornar (default 20)
   *     responses:
   *       200:
   *         description: Lista de reseñas obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 count:
   *                   type: integer
   *                   example: 15
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Review'
   *       500:
   *         description: Error del servidor
   */
  static async getAllReviews(req, res) {
    try {
      const reviews = await DatabaseService.getAllReviews();
      return res.json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * @swagger
   * /api/reviews/{id}:
   *   get:
   *     summary: Obtener reseña por ID
   *     description: Retorna una reseña específica por su ID
   *     tags:
   *       - Reviews
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID de la reseña
   *     responses:
   *       200:
   *         description: Reseña encontrada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Review'
   *       404:
   *         description: Reseña no encontrada
   *       500:
   *         description: Error del servidor
   */
  static async getReviewById(req, res) {
    try {
      const review = await DatabaseService.getReviewById(req.params.id);
      if (!review) {
        return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
      }
      return res.json({ success: true, data: review });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * @swagger
   * /api/reviews:
   *   post:
   *     summary: Crear nueva reseña
   *     description: Crea una nueva reseña (requiere autenticación)
   *     tags:
   *       - Reviews
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - content
   *               - rating
   *               - movie_title
   *             properties:
   *               title:
   *                 type: string
   *                 example: 'Gran película'
   *               content:
   *                 type: string
   *                 example: 'Me encantó la trama y los efectos especiales'
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 5
   *               movie_title:
   *                 type: string
   *                 example: 'Avatar'
   *     responses:
   *       201:
   *         description: Reseña creada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Reseña publicada exitosamente
   *                 review:
   *                   $ref: '#/components/schemas/Review'
   *       400:
   *         description: Error de validación
   *       401:
   *         description: No autenticado
   *       500:
   *         description: Error del servidor
   */
  static async createReviewAPI(req, res) {
    try {
      const reviewData = req.body;
      const review = await DatabaseService.createReview(reviewData);
      return res.status(201).json({ success: true, message: 'Reseña creada', review });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Crear reseña desde panel admin (form multipart)
 static async createReviewAdmin(req, res) {
    try {
        const { movie_id, movie_title, poster_url, user_id, title, rating, content } = req.body;
        const is_featured = req.body.is_featured === 'true' || req.body.is_featured === 'on' || req.body.is_featured === true;

        console.log('📝 Creando reseña desde admin con datos:', {
            movie_id,
            movie_title,
            poster_url,
            user_id,
            title,
            rating,
            is_featured
        });

        let review_image = poster_url || null;
        
        if (req.file) {
            review_image = '/uploads/reviews/' + req.file.filename;
            console.log('🖼️ Imagen subida para reseña:', review_image);
        }

        const reviewData = {
            movie_id: movie_id ? parseInt(movie_id) : null,
            movie_title: movie_title || null,
            user_id: user_id ? parseInt(user_id) : null,
            title: title || null,
            rating: rating ? Number(rating) : 5,
            content: content || null,
            review_image: review_image,
            is_featured: !!is_featured,
            is_active: true
        };

        console.log('💾 Guardando reseña con datos corregidos:', reviewData);

        const createdReview = await DatabaseService.createReview(reviewData);
        
        console.log('✅ Reseña creada exitosamente:', {
            id: createdReview.id,
            movie_title: createdReview.movie_title,
            review_image: createdReview.review_image
        });

        return res.redirect('/admin?success=Reseña creada correctamente');
    } catch (error) {
        console.error('❌ Error creando reseña desde admin:', error);
        return res.redirect('/admin/reviews/new?error=Error al crear reseña: ' + error.message);
    }
}

  static async showEditReviewForm(req, res) {
    try {
      const review = await DatabaseService.getReviewById(req.params.id);
      const movies = await DatabaseService.getAllMovies();
      const users = await DatabaseService.getAllUsers();

      if (!review) return res.redirect('/admin?error=Reseña no encontrada');

      return res.render('admin-review-form', {
        title: 'Editar Reseña - Admin',
        user: req.session.user,
        movies: movies || [],
        users: users || [],
        error: null,
        success: null,
        editReview: review
      });
    } catch (error) {
      console.error('Error cargando reseña para editar:', error);
      return res.redirect('/admin?error=Error al cargar reseña');
    }
  }

  /**
   * Actualizar reseña desde admin
   */
 static async updateReviewAdmin(req, res) {
    try {
        const reviewId = req.params.id;
        const { movie_id, movie_title, user_id, title, rating, content, poster_url } = req.body;
        const is_featured = req.body.is_featured === 'true' || req.body.is_featured === 'on';

        console.log(`📝 Actualizando reseña ${reviewId}:`, {
            movie_id, movie_title, user_id, title, rating
        });

        const currentReview = await DatabaseService.getReviewById(reviewId);
        
        let review_image = poster_url || currentReview.review_image;
        
        if (req.file) {
            review_image = '/uploads/reviews/' + req.file.filename;
            console.log('🖼️ Nueva imagen para reseña:', review_image);
            
            if (currentReview.review_image && !currentReview.review_image.includes('default')) {
                const oldImagePath = path.join(__dirname, '..', 'public', currentReview.review_image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        const reviewData = {
            movie_id: movie_id ? parseInt(movie_id) : null,
            movie_title: movie_title || null,
            user_id: user_id ? parseInt(user_id) : null,
            title: title || null,
            rating: rating ? Number(rating) : 5,
            content: content || null,
            review_image: review_image,
            is_featured: !!is_featured
        };

        console.log('💾 Actualizando reseña con datos:', reviewData);

        await DatabaseService.updateReview(reviewId, reviewData);
        
        console.log(`✅ Reseña ${reviewId} actualizada correctamente`);
        return res.redirect('/admin?success=Reseña actualizada correctamente');
    } catch (error) {
        console.error('❌ Error actualizando reseña desde admin:', error);
        return res.redirect(`/admin/reviews/${req.params.id}/edit?error=Error al actualizar reseña: ${error.message}`);
    }
}

  // Compatibility alias: updateReview
  static async updateReview(req, res) {
    return this.updateReviewAdmin(req, res);
  }

  // Compatibility alias: deleteReview
  static async deleteReview(req, res) {
    return this.deleteReviewAdmin(req, res);
  }

  /**
   * Toggle featured flag (admin)
   */
  static async toggleFeatured(req, res) {
    try {
      const review = await DatabaseService.getReviewById(req.params.id);
      if (!review) return res.redirect('/admin?error=Reseña no encontrada');
      await DatabaseService.updateReview(review.id, { is_featured: !review.is_featured });
      return res.redirect('/admin?success=Estado destacado actualizado');
    } catch (error) {
      console.error('Error toggling featured:', error);
      return res.redirect('/admin?error=Error al cambiar estado destacado');
    }
  }

  /**
   * Eliminar reseña desde admin
   */
  static async deleteReviewAdmin(req, res) {
    try {
      await DatabaseService.deleteReview(req.params.id);
      return res.redirect('/admin?success=Reseña eliminada correctamente');
    } catch (error) {
      console.error('Error eliminando reseña desde admin:', error);
      return res.redirect('/admin?error=Error al eliminar reseña');
    }
  }

  /**
   * @swagger
   * /review/{id}:
   *   get:
   *     summary: Obtener reseña por ID (página web)
   *     description: Retorna una reseña específica por su ID como página web
   *     tags:
   *       - Pages
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID de la reseña
   *     responses:
   *       200:
   *         description: Reseña encontrada
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *       404:
   *         description: Reseña no encontrada
   *       500:
   *         description: Error del servidor
   */
static async showReview(req, res) {
  try {
    console.log('🔍 Buscando reseña ID:', req.params.id);
    
    // Obtener reseña con información del usuario usando el alias correcto 'user'
    const review = await DatabaseService.Review.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: DatabaseService.User,
          as: 'user', // Usar el alias correcto 'user' en minúsculas
          attributes: ['id', 'username', 'role', 'email']
        }
      ]
    });

    if (!review) {
      return res.status(404).render('404', {
        title: 'Reseña No Encontrada',
        user: req.session.user
      });
    }

    // Asegurar que los datos del usuario estén disponibles
    const reviewData = review.toJSON();
    
    if (review.user) {
      reviewData.username = review.user.username;
      reviewData.user_role = review.user.role;
    } else {
      // Si no hay datos del usuario, intentar obtenerlos por separado
      try {
        const user = await DatabaseService.User.findByPk(reviewData.user_id);
        if (user) {
          reviewData.username = user.username;
          reviewData.user_role = user.role;
        } else {
          reviewData.username = 'Usuario desconocido';
          reviewData.user_role = 'user';
        }
      } catch (userError) {
        console.warn('No se pudieron cargar datos del usuario:', userError.message);
        reviewData.username = 'Usuario desconocido';
        reviewData.user_role = 'user';
      }
    }

    console.log('👤 Datos del autor:', {
      username: reviewData.username,
      user_role: reviewData.user_role,
      user_id: reviewData.user_id,
      hasUserAssociation: !!review.user
    });

    console.log('🎬 Reseña encontrada:', {
      id: reviewData.id,
      movie_title: reviewData.movie_title,
      movie_id: reviewData.movie_id
    });

    // Obtener la película asociada
    let movie = null;
    let product = null;
    
    if (reviewData.movie_id) {
      try {
        movie = await DatabaseService.Movie.findByPk(reviewData.movie_id);
        
        if (movie) {
          try {
            product = await DatabaseService.Product.findOne({
              where: { movie_id: reviewData.movie_id }
            });
          } catch (productError) {
            console.warn('No se pudo cargar producto para la película:', productError.message);
            product = null;
          }
        }
      } catch (movieError) {
        console.error('Error cargando película para la reseña:', movieError);
        movie = null;
      }
    }

    // Lógica de imágenes
    console.log('\n🔍 DEBUG DE IMÁGENES:');
    console.log('📸 Reseña - poster_image:', reviewData.poster_image);
    console.log('📸 Reseña - review_image:', reviewData.review_image);
    console.log('🎬 Película - poster_image:', movie?.poster_image);
    
    let imageUrl = '/images/default-poster.jpg';
    let imageSource = 'default';
    
    if (reviewData.review_image && reviewData.review_image !== '') {
      if (reviewData.review_image.startsWith('/uploads/')) {
        imageUrl = reviewData.review_image;
      } else {
        imageUrl = `/uploads/reviews/${reviewData.review_image}`;
      }
      imageSource = 'review_image';
      console.log('✅ Usando imagen de reseña:', imageUrl);
    } else if (movie?.poster_image) {
      if (movie.poster_image.startsWith('/uploads/')) {
        imageUrl = movie.poster_image;
      } else {
        imageUrl = `/uploads/movies/${movie.poster_image}`;
      }
      imageSource = 'movie_poster';
      console.log('✅ Usando poster de película:', imageUrl);
    } else if (reviewData.poster_image && reviewData.poster_image !== '') {
      if (reviewData.poster_image.startsWith('/uploads/')) {
        imageUrl = reviewData.poster_image;
      } else {
        imageUrl = `/uploads/reviews/${reviewData.poster_image}`;
      }
      imageSource = 'review_poster';
      console.log('✅ Usando poster de reseña:', imageUrl);
    } else {
      console.log('⚠️ Usando imagen por defecto');
    }

    console.log('🖼️ URL final de imagen:', imageUrl);
    console.log('📁 Fuente de imagen:', imageSource);

    // Pasar todo a la vista
    res.render('review-template', {
      title: `${reviewData.movie_title} - CineCríticas`,
      review: reviewData,
      movie: movie,
      product: product,
      imageUrl: imageUrl,
      imageSource: imageSource,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error cargando reseña:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar la reseña.',
      user: req.session.user
    });
  }
}
}

module.exports = ReviewController;