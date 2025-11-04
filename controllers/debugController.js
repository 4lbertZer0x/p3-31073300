const DatabaseService = require('../services/DatabaseService');
const fs = require('fs');
const path = require('path');

class DebugController {
  
  /**
   * Información de debug de usuarios
   */
  static async debugUsers(req, res) {
    try {
      const users = await DatabaseService.getAllUsers();
      const debugInfo = await DatabaseService.getDebugInfo();
      
      res.json({
        message: 'Información de debug',
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        })),
        database: debugInfo.database
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Información de debug de películas
   */
  static async debugMovies(req, res) {
    try {
      const movies = await DatabaseService.getAllMovies();
      
      res.json({
        message: 'Películas en la base de datos',
        count: movies.length,
        movies: movies
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Resetear base de datos (solo desarrollo)
   */
  static async resetDatabase(req, res) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).send('No disponible en producción');
    }
    
    try {
      const dbPath = path.join(__dirname, 'cinecriticas.db');
      
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      
      // Reiniciar la base de datos
      await DatabaseService.initialize();
      await DatabaseService.ensureTestUsers();
      await DatabaseService.seedInitialMovies();
      
      res.json({ 
        message: 'Base de datos reseteada correctamente',
        users: await DatabaseService.getAllUsers(),
        movies: await DatabaseService.getAllMovies()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = DebugController;