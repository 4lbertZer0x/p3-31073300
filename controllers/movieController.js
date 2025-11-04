const DatabaseService = require('../services/DatabaseService');

class MovieController {
  
  /**
   * Mostrar formulario para nueva película
   */
  static showNewMovieForm(req, res) {
    res.render('movie-form', {
      title: 'Nueva Película/Serie - CineCríticas',
      user: req.session.user,
      movie: null,
      error: null,
      success: null
    });
  }

  /**
   * Crear nueva película
   */
  static async createMovie(req, res) {
    try {
      const { title, year, genre, description, type, poster_url } = req.body;
      
      console.log('🎬 Creando nueva película/serie:', { title, year, type });
      
      if (!title || !year || !genre || !type) {
        return res.render('movie-form', {
          title: 'Nueva Película/Serie - CineCríticas',
          user: req.session.user,
          movie: null,
          error: 'Todos los campos marcados con * son requeridos',
          success: null
        });
      }

      let final_poster_url = '/images/default-poster.jpg';
      
      if (req.file) {
        final_poster_url = '/uploads/movies/' + req.file.filename;
        console.log('🖼️ Imagen subida:', final_poster_url);
      } else if (poster_url && poster_url.trim() !== '') {
        final_poster_url = poster_url.trim();
        console.log('🌐 Usando URL externa:', final_poster_url);
      }

      await DatabaseService.createMovie({
        title: title.trim(),
        year: year.trim(),
        genre: genre.trim(),
        description: description ? description.trim() : null,
        type: type,
        poster_url: final_poster_url,
        is_active: true
      });
      
      console.log('✅ Película/Serie creada exitosamente:', title);
      res.redirect('/admin?success=Película/Serie creada correctamente');
      
    } catch (error) {
      console.error('❌ Error creando película:', error);
      
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      res.render('movie-form', {
        title: 'Nueva Película/Serie - CineCríticas',
        user: req.session.user,
        movie: null,
        error: 'Error creando la película/serie: ' + error.message,
        success: null
      });
    }
  }

  /**
   * Mostrar formulario para editar película
   */
  static async showEditMovieForm(req, res) {
    try {
      const movie = await DatabaseService.getMovieById(req.params.id);
      
      if (!movie) {
        return res.redirect('/admin?error=Película no encontrada');
      }

      res.render('movie-form', {
        title: 'Editar Película/Serie - CineCríticas',
        user: req.session.user,
        movie: movie,
        error: null,
        success: null
      });
    } catch (error) {
      console.error('Error cargando película para editar:', error);
      res.redirect('/admin?error=Error al cargar película');
    }
  }

  /**
   * Desactivar película
   */
  static async deleteMovie(req, res) {
    try {
      await DatabaseService.deleteMovie(req.params.id);
      res.redirect('/admin?success=Película/Serie desactivada correctamente');
    } catch (error) {
      console.error('Error desactivando película:', error);
      res.redirect('/admin?error=Error al desactivar la película');
    }
  }

  /**
   * Activar película
   */
  static async activateMovie(req, res) {
    try {
      await DatabaseService.updateMovie(req.params.id, { is_active: true });
      res.redirect('/admin?success=Película/Serie activada correctamente');
    } catch (error) {
      console.error('Error activando película:', error);
      res.redirect('/admin?error=Error al activar la película');
    }
  }
}

module.exports = MovieController;