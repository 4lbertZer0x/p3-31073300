const DatabaseService = require('../services/DatabaseService');

class AdminController {
  
  /**
   * Mostrar panel de administración
   */
  static async showDashboard(req, res) {
    try {
      const users = await DatabaseService.getAllUsers();
      const reviews = await DatabaseService.getAllReviews();
      const movies = await DatabaseService.getAllMovies();
      
      res.render('admin', {
        user: req.session.user,
        users: users,
        reviews: reviews,
        movies: movies,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Error cargando panel admin:', error);
      res.status(500).render('admin', {
        user: req.session.user,
        users: [],
        reviews: [],
        movies: [],
        error: 'Error al cargar el panel de administración'
      });
    }
  }

  /**
   * Mostrar formulario para nuevo usuario
   */
  static showNewUserForm(req, res) {
    res.render('new-user', {
      title: 'Nuevo Usuario - CineCríticas',
      user: req.session.user,
      error: null,
      success: null
    });
  }

  /**
   * Mostrar formulario para editar usuario
   */
  static async showEditUserForm(req, res) {
    try {
      const userToEdit = await DatabaseService.getUserById(req.params.id);
      
      if (!userToEdit) {
        return res.redirect('/admin?error=Usuario no encontrado');
      }

      res.render('edit-user', {
        title: 'Editar Usuario - CineCríticas',
        user: req.session.user,
        userToEdit: userToEdit,
        error: null,
        success: null
      });
    } catch (error) {
      console.error('Error cargando usuario para editar:', error);
      res.redirect('/admin?error=Error al cargar usuario');
    }
  }
}

module.exports = AdminController;