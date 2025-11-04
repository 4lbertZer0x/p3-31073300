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
    // ... código existente
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
    // ... código existente
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
    // ... código existente
  }
}

module.exports = UserController;