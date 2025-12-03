const DatabaseService = require('../services/DatabaseService');

class UserController {

  /**
   * @swagger
   * /my-reviews:
   *   get:
   *     summary: Obtener reseñas del usuario actual
   *     description: Retorna las reseñas del usuario autenticado
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Reseñas del usuario obtenidas exitosamente
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *       401:
   *         description: No autenticado
   */
  static async showUserReviews(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }
      
      const reviews = await DatabaseService.getReviewsByUserId(req.user.id);
      return res.json({ success: true, data: reviews });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * @swagger
   * /api/user/profile:
   *   get:
   *     summary: Obtener perfil del usuario actual
   *     description: Retorna la información del usuario autenticado
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Perfil obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: No autenticado
   *       500:
   *         description: Error del servidor
   */
  static async getProfile(req, res) {
    try {
      const user = await DatabaseService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
      
      const { password_hash, ...userWithoutPassword } = user;
      return res.json({ success: true, data: userWithoutPassword });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * @swagger
   * /api/user/profile:
   *   put:
   *     summary: Actualizar perfil del usuario
   *     description: Actualiza la información del perfil del usuario autenticado
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               full_name:
   *                 type: string
   *                 description: Nombre completo del usuario
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Email del usuario
   *               current_password:
   *                 type: string
   *                 description: Contraseña actual (requerida para cambiar contraseña)
   *               new_password:
   *                 type: string
   *                 description: Nueva contraseña
   *     responses:
   *       200:
   *         description: Perfil actualizado exitosamente
   *       400:
   *         description: Datos inválidos o error de validación
   *       401:
   *         description: No autenticado
   *       500:
   *         description: Error del servidor
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { full_name, email, current_password, new_password } = req.body;

      console.log('🔍 DEBUG - Actualizando perfil para usuario:', userId);
      console.log('🔍 DEBUG - Datos recibidos:', { full_name, email, hasCurrentPassword: !!current_password, hasNewPassword: !!new_password });

      // Preparar datos para actualizar
      const updateData = {};
      
      if (full_name !== undefined) updateData.full_name = full_name;
      if (email !== undefined) updateData.email = email;

      // Manejar cambio de contraseña si se proporciona
      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ 
            success: false, 
            message: 'La contraseña actual es requerida para cambiar la contraseña' 
          });
        }
        updateData.current_password = current_password;
        updateData.new_password = new_password;
      }

      // Validar que hay datos para actualizar
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se proporcionaron datos para actualizar' 
        });
      }

      console.log('🔍 DEBUG - Llamando a DatabaseService.updateUserProfile');
      const updatedUser = await DatabaseService.updateUserProfile(userId, updateData);

      const { password_hash, ...userWithoutPassword } = updatedUser;

      console.log('✅ Perfil actualizado exitosamente');
      return res.json({ 
        success: true, 
        message: 'Perfil actualizado correctamente',
        data: userWithoutPassword 
      });

    } catch (error) {
      console.error('❌ Error en updateProfile:', error.message);
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  /**
   * @swagger
   * /api/admin/users:
   *   get:
   *     summary: Obtener todos los usuarios (Solo Admin)
   *     description: Retorna la lista completa de usuarios. Requiere permisos de administrador.
   *     tags:
   *       - Admin
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de usuarios obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       401:
   *         description: No autenticado
   *       403:
   *         description: No tiene permisos de administrador
   *       500:
   *         description: Error del servidor
   */
  static async listUsers(req, res) {
    try {
      const users = await DatabaseService.getAllUsers();
      const usersWithoutPasswords = users.map(user => {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      return res.json({ success: true, data: usersWithoutPasswords });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = UserController;