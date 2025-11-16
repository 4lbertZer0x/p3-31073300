const DatabaseService = require('../services/DatabaseService');
const fs = require('fs');
const path = require('path');

class MovieController {
  
  /**
   * Mostrar formulario para nueva película
   */
  static showNewMovieForm(req, res) {
    res.render('movie-form', {
      title: 'Nueva Película/Serie - CineCríticas',
      user: req.session.user,
      movie: null,
      product: null,
      error: null,
      success: null
    });
  }

  /**
   * Crear nueva película - CORREGIDO con mapeo completo
   */
  static async createMovie(req, res) {
    try {
      const { title, year, genre, description, type, poster_url, price } = req.body;
      
      console.log('🎬 Creando nueva película/serie:', { title, year, genre, type, price });
      
      // Validación más robusta
      if (!title?.trim() || !year?.trim() || !genre?.trim()) {
        return res.render('movie-form', {
          title: 'Nueva Película/Serie - CineCríticas',
          user: req.session.user,
          movie: null,
          product: null,
          error: 'Todos los campos marcados con * son requeridos',
          success: null
        });
      }

      // Validar año
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 1888 || yearNum > new Date().getFullYear() + 5) {
        return res.render('movie-form', {
          title: 'Nueva Película/Serie - CineCríticas',
          user: req.session.user,
          movie: null,
          product: null,
          error: 'El año debe ser un valor válido',
          success: null
        });
      }

      let final_poster_image = '/images/default-poster.jpg';
      
      // CORREGIDO: Manejar tanto poster_image (archivo) como poster_url (URL)
      if (req.file) {
        // Validar tipo de archivo
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimes.includes(req.file.mimetype)) {
          fs.unlinkSync(req.file.path);
          return res.render('movie-form', {
            title: 'Nueva Película/Serie - CineCríticas',
            user: req.session.user,
            movie: null,
            product: null,
            error: 'Formato de imagen no válido. Use JPEG, PNG, GIF o WebP',
            success: null
          });
        }
        // Archivo subido a través de poster_image
        final_poster_image = '/uploads/movies/' + req.file.filename;
        console.log('🖼️ Imagen subida:', final_poster_image);
      } else if (poster_url?.trim()) {
        // URL externa proporcionada
        try {
          new URL(poster_url.trim());
          final_poster_image = poster_url.trim();
          console.log('🌐 Usando URL externa:', final_poster_image);
        } catch (urlError) {
          console.warn('URL de póster inválida:', poster_url);
        }
      }

      // CORREGIDO: Mapeo completo con todos los campos del modelo
      const movieData = {
        title: title.trim(),
        release_year: yearNum, // Convertir a número
        genre: genre.trim(), // ¡AGREGAR ESTE CAMPO!
        description: description ? description.trim() : null,
        poster_image: final_poster_image,
        type: type || 'movie', // ¡AGREGAR ESTE CAMPO!
        is_active: true,
        // Campos que no existen en el formulario pero sí en el modelo
        director: '',
        duration: null,
        trailer_url: '',
        price: price ? parseFloat(price) : null // ¡CONVERTIR A NÚMERO!
      };

      // DEBUG: Mostrar datos que se van a guardar
      console.log('📝 Datos CORREGIDOS a guardar en la base de datos:', movieData);

      // Crear la película/serie
      const created = await DatabaseService.createMovie(movieData);

      // DEBUG: Verificar qué se creó
      console.log('✅ Película creada en BD:', created);

      // CORREGIDO: Manejo del producto con precio correcto
      if (price && !isNaN(parseFloat(price)) && parseFloat(price) > 0) {
        const productPrice = parseFloat(price);
        await MovieController._handleProductAssociation(
          created.id, 
          created.title, 
          description ? description.trim() : `Producto para ${created.title}`, 
          productPrice, 
          type || 'movie',
          'create'
        );
      }

      console.log('✅ Película/Serie creada exitosamente:', title);
      res.redirect('/admin?success=Película/Serie creada correctamente');
      
    } catch (error) {
      console.error('❌ Error creando película:', error);
      
      // Limpiar archivo subido en caso de error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error eliminando archivo temporal:', unlinkError);
        }
      }
      
      res.render('movie-form', {
        title: 'Nueva Película/Serie - CineCríticas',
        user: req.session.user,
        movie: null,
        product: null,
        error: 'Error creando la película/serie: ' + (error.message || 'Error desconocido'),
        success: null
      });
    }
  }

  /**
   * Mostrar formulario para editar película - CORREGIDO
   */
  static async showEditMovieForm(req, res) {
    try {
      const movieId = parseInt(req.params.id);
      
      if (isNaN(movieId) || movieId <= 0) {
        return res.redirect('/admin?error=ID de película inválido');
      }

      console.log(`🎬 Cargando película para editar ID: ${movieId}`);
      
      const movie = await DatabaseService.getMovieById(movieId);
      
      if (!movie) {
        return res.redirect('/admin?error=Película no encontrada');
      }

      // CORREGIDO: Mapear campos del modelo a campos del formulario (COMPLETO)
      const formattedMovie = {
        id: movie.id,
        title: movie.title,
        year: movie.release_year,
        genre: movie.genre || '', // ¡AGREGAR ESTE CAMPO!
        description: movie.description,
        type: movie.type || 'movie', // ¡AGREGAR ESTE CAMPO!
        poster_url: movie.poster_image,
        is_active: movie.is_active
      };

      // DEBUG: Verificar datos de la película
      console.log('📋 Datos CORREGIDOS de la película cargada:', formattedMovie);

      // Intentar obtener product asociado (precio) de forma segura
      let product = null;
      try {
        product = await MovieController._getProductForMovie(movieId);
        console.log(`📦 Producto encontrado para película ${movieId}:`, product ? 'Sí' : 'No');
      } catch (err) {
        console.error('❌ Error buscando producto para película:', err.message);
        product = null;
      }

      res.render('movie-form', {
        title: 'Editar Película/Serie - CineCríticas',
        user: req.session.user,
        movie: formattedMovie,
        product: product,
        error: req.query.error || null,
        success: req.query.success || null
      });
    } catch (error) {
      console.error('❌ Error cargando película para editar:', error);
      res.redirect('/admin?error=Error al cargar película: ' + (error.message || 'Error desconocido'));
    }
  }

  /**
   * Actualizar película (desde admin) - CORREGIDO
   */
  static async updateMovie(req, res) {
    let uploadedFile = null;
    
    try {
      const movieId = parseInt(req.params.id);
      const { title, year, genre, description, type, poster_url, price } = req.body;

      if (isNaN(movieId) || movieId <= 0) {
        return res.redirect('/admin?error=ID de película inválido');
      }

      console.log(`🎬 Actualizando película ID: ${movieId}`, { title, year, genre, price });

      // Verificar que la película existe
      const existingMovie = await DatabaseService.getMovieById(movieId);
      if (!existingMovie) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.redirect('/admin?error=Película no encontrada');
      }

      // Validaciones
      if (!title?.trim() || !year?.trim() || !genre?.trim()) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.redirect(`/admin/movies/${movieId}/edit?error=Título, año y género son requeridos`);
      }

      let final_poster_image = poster_url || existingMovie.poster_image;
      
      if (req.file) {
        uploadedFile = req.file;
        
        // Validar tipo de archivo
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimes.includes(req.file.mimetype)) {
          fs.unlinkSync(req.file.path);
          return res.redirect(`/admin/movies/${movieId}/edit?error=Formato de imagen no válido`);
        }
        
        final_poster_image = '/uploads/movies/' + req.file.filename;
        
        // Eliminar imagen anterior si no es la default
        if (existingMovie.poster_image && 
            !existingMovie.poster_image.includes('/images/default-poster.jpg') &&
            !existingMovie.poster_image.startsWith('http')) {
          try {
            const oldImagePath = path.join(__dirname, '..', 'public', existingMovie.poster_image);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          } catch (unlinkError) {
            console.error('Error eliminando imagen anterior:', unlinkError);
          }
        }
      }

      // CORREGIDO: Mapeo completo con todos los campos
      const updateData = {
        title: title.trim(),
        release_year: parseInt(year),
        genre: genre.trim(), // ¡AGREGAR ESTE CAMPO!
        description: description ? description.trim() : existingMovie.description,
        poster_image: final_poster_image,
        type: type || 'movie', // ¡AGREGAR ESTE CAMPO!
        price: price ? parseFloat(price) : null // ¡CONVERTIR A NÚMERO!
      };

      // DEBUG: Mostrar datos de actualización
      console.log('📝 Datos CORREGIDOS de actualización:', updateData);

      // Actualizar la película
      await DatabaseService.updateMovie(movieId, updateData);

      // CORREGIDO: Manejo del producto con precio correcto
      if (price && !isNaN(parseFloat(price)) && parseFloat(price) > 0) {
        const productPrice = parseFloat(price);
        const productName = title.trim() || existingMovie.title;
        const productDescription = description ? description.trim() : existingMovie.description || `Producto para ${productName}`;
        await MovieController._handleProductAssociation(
          movieId, 
          productName, 
          productDescription, 
          productPrice, 
          type || 'movie',
          'update'
        );
      } else {
        // Si no hay precio válido, eliminar producto
        await MovieController._deleteProductAssociation(movieId);
      }

      console.log(`✅ Película ${movieId} actualizada correctamente`);
      return res.redirect(`/admin/movies/${movieId}/edit?success=Película/Serie actualizada correctamente`);
    } catch (error) {
      console.error('❌ Error actualizando película:', error);
      
      // Limpiar archivo subido en caso de error
      if (uploadedFile && fs.existsSync(uploadedFile.path)) {
        try {
          fs.unlinkSync(uploadedFile.path);
        } catch (unlinkError) {
          console.error('Error eliminando archivo temporal:', unlinkError);
        }
      }
      
      return res.redirect(`/admin/movies/${req.params.id}/edit?error=Error al actualizar la película: ${error.message || 'Error desconocido'}`);
    }
  }

  /**
   * Desactivar película
   */
  static async deleteMovie(req, res) {
    try {
      const movieId = parseInt(req.params.id);
      
      if (isNaN(movieId) || movieId <= 0) {
        return res.redirect('/admin?error=ID de película inválido');
      }

      // Verificar que la película existe
      const movie = await DatabaseService.getMovieById(movieId);
      if (!movie) {
        return res.redirect('/admin?error=Película no encontrada');
      }

      await DatabaseService.deleteMovie(movieId);
      
      // También eliminar producto asociado si existe
      await MovieController._deleteProductAssociation(movieId);

      res.redirect('/admin?success=Película/Serie desactivada correctamente');
    } catch (error) {
      console.error('❌ Error desactivando película:', error);
      res.redirect('/admin?error=Error al desactivar la película: ' + (error.message || 'Error desconocido'));
    }
  }

  /**
   * Activar película
   */
  static async activateMovie(req, res) {
    try {
      const movieId = parseInt(req.params.id);
      
      if (isNaN(movieId) || movieId <= 0) {
        return res.redirect('/admin?error=ID de película inválido');
      }

      // Verificar que la película existe
      const movie = await DatabaseService.getMovieById(movieId);
      if (!movie) {
        return res.redirect('/admin?error=Película no encontrada');
      }

      await DatabaseService.updateMovie(movieId, { is_active: true });
      res.redirect('/admin?success=Película/Serie activada correctamente');
    } catch (error) {
      console.error('❌ Error activando película:', error);
      res.redirect('/admin?error=Error al activar la película: ' + (error.message || 'Error desconocido'));
    }
  }

  // ================= MÉTODOS PRIVADOS AUXILIARES =================

  /**
   * Obtener producto asociado a una película (MANEJO SEGURO)
   */
  static async _getProductForMovie(movieId) {
    try {
      const product = await DatabaseService.Product.findOne({
        where: { movie_id: movieId }
      });
      return product;
    } catch (err) {
      console.error('❌ Error en _getProductForMovie:', err.message);
      return null;
    }
  }

  /**
   * Manejar asociación de producto (crear o actualizar) - CORREGIDO
   */
  static async _handleProductAssociation(movieId, name, description, price, productType, operation) {
    try {
      const existingProduct = await MovieController._getProductForMovie(movieId);
      
      if (existingProduct) {
        // Actualizar producto existente
        await DatabaseService.Product.update(
          {
            name: name,
            description: description,
            price: price,
            type: productType,
            updated_at: new Date()
          },
          {
            where: { movie_id: movieId }
          }
        );
        console.log(`✅ Producto actualizado para película ${movieId}`);
      } else {
        // Crear nuevo producto
        await DatabaseService.Product.create({
          name: name,
          description: description,
          price: price,
          type: productType,
          movie_id: movieId,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`✅ Producto creado para película ${movieId}`);
      }
    } catch (err) {
      console.error(`❌ Error en _handleProductAssociation (${operation}):`, err.message);
    }
  }

  /**
   * Eliminar asociación de producto
   */
  static async _deleteProductAssociation(movieId) {
    try {
      await DatabaseService.Product.destroy({
        where: { movie_id: movieId }
      });
      console.log(`🗑️ Producto eliminado para película ${movieId}`);
    } catch (err) {
      console.error('❌ Error en _deleteProductAssociation:', err.message);
    }
  }
}

module.exports = MovieController;