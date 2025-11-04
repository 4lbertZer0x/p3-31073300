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
    // ... código existente
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
    // ... código existente
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
    // ... código existente
  }

  /**
   * @swagger
   * /review/{id}:
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
   *           text/html:
   *             schema:
   *               type: string
   *       404:
   *         description: Reseña no encontrada
   *       500:
   *         description: Error del servidor
   */
  static async showReview(req, res) {
    // ... código existente
  }
}

module.exports = ReviewController;