const DatabaseService = require('../services/DatabaseService');

class AdminController {
  
  /**
   * Mostrar panel de administración
   */
static async showDashboard(req, res) {
  try {
    console.log('📊 Cargando panel de administración...');
    
    const users = await DatabaseService.getAllUsers();
    const reviews = await DatabaseService.getAllReviews();
    const movies = await DatabaseService.getAllMovies();
    
    let products = [];
    if (DatabaseService.getAllProducts && typeof DatabaseService.getAllProducts === 'function') {
      console.log('🛍️ Obteniendo productos electrónicos...');
      products = await DatabaseService.getAllProducts();
      console.log(`✅ Encontrados ${products.length} productos`);
      
      // DEBUG: Mostrar qué hay realmente en products
      console.log('🔍 DEBUG - Primeros 3 productos:');
      products.slice(0, 3).forEach((p, i) => {
        const plain = p.toJSON ? p.toJSON() : p;
        console.log(`${i+1}. ID: ${plain.id}, Nombre: "${plain.name || plain.title}", Precio: $${plain.price}`);
      });
    }

    // DEBUG: Pasar los productos como JSON plano a la vista
    const plainProducts = products.map(p => {
      const plain = p.toJSON ? p.toJSON() : p;
      return {
        id: plain.id,
        name: plain.name || plain.title || 'Sin nombre',
        title: plain.title || plain.name || 'Sin título',
        price: plain.price || 0,
        description: plain.description || '',
        created_at: plain.created_at || new Date(),
        category: plain.category || 'Sin categoría',
        is_active: plain.is_active !== undefined ? plain.is_active : true,
        // Asegurar que Categories exista
        Categories: plain.Categories || []
      };
    });

    console.log(`📤 Enviando ${plainProducts.length} productos a la vista`);

    res.render('admin', {
      title: 'Panel de Administración - ElectroTienda',
      user: req.session.user,
      users: users || [],
      reviews: reviews || [],
      movies: movies || [],
      products: plainProducts, // Usar los productos convertidos a JSON plano
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('❌ Error cargando panel admin:', error);
    res.status(500).render('admin', {
      title: 'Error - Panel de Administración',
      user: req.session.user,
      users: [],
      reviews: [],
      movies: [],
      products: [],
      error: 'Error al cargar el panel de administración: ' + error.message
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

  /**
   * Crear nuevo usuario desde panel admin
   */
  static async createUser(req, res) {
    try {
      const { username, email, password, confirmPassword, role } = req.body;
      if (!username || !email || !password || password !== confirmPassword) {
        return res.render('new-user', {
          title: 'Nuevo Usuario - CineCríticas',
          user: req.session.user,
          error: 'Datos inválidos o contraseñas no coinciden',
          success: null,
          username,
          email
        });
      }

      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash(password, 10);

      await DatabaseService.createUser({ username, email, password_hash: hashed, role: role || 'user' });

      res.redirect('/admin?success=Usuario creado correctamente');
    } catch (error) {
      console.error('Error creando usuario desde admin:', error);
      res.render('new-user', {
        title: 'Nuevo Usuario - CineCríticas',
        user: req.session.user,
        error: 'Error al crear usuario: ' + (error.message || 'unknown'),
        success: null,
        username: req.body.username,
        email: req.body.email
      });
    }
  }

  /**
   * Actualizar usuario (desde admin)
   */
  static async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const { username, email, role, password } = req.body;

      const updatePayload = {};
      if (username) updatePayload.username = username.trim();
      if (email) updatePayload.email = email.trim();
      if (role) updatePayload.role = role;
      if (password) updatePayload.password_hash = password; // hooks will hash if plain

      await DatabaseService.updateUser(userId, updatePayload);
      return res.redirect('/admin?success=Usuario actualizado correctamente');
    } catch (error) {
      console.error('Error actualizando usuario desde admin:', error);
      return res.redirect('/admin?error=Error al actualizar usuario');
    }
  }

  /**
   * Eliminar usuario (desde admin)
   */
  static async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      await DatabaseService.deleteUser(userId);
      return res.redirect('/admin?success=Usuario eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando usuario desde admin:', error);
      return res.redirect('/admin?error=Error al eliminar usuario');
    }
  }
}

module.exports = AdminController;