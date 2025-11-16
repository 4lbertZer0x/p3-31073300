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