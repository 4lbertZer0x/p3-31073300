const DatabaseService = require('../services/DatabaseService');

class PageController {
  
  /**
   * @swagger
   * /:
   *   get:
   *     summary: Página principal
   *     description: Renderiza la página principal con reseñas destacadas
   *     tags:
   *       - Pages
   *     responses:
   *       200:
   *         description: Página principal renderizada
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   */
  static async showHome(req, res) {
    // ... código existente
  }

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Verificar estado del servidor
   *     description: Endpoint de salud para verificar que la API está funcionando
   *     tags:
   *       - Health
   *     responses:
   *       200:
   *         description: Servidor funcionando correctamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   *       500:
   *         description: Error del servidor
   */
  static healthCheck(req, res) {
    // ... código existente
  }
}

module.exports = PageController;