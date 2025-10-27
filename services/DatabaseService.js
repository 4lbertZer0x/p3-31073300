// services/DatabaseService.js
const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // máximo de conexiones
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('❌ Error de PostgreSQL:', err);
    });
  }

  getClient() {
    return this.pool;
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async getUserByUsername(username) {
    try {
      const result = await this.query(
        'SELECT * FROM users WHERE username = $1', 
        [username]
      );
      
      if (result.rows.length === 0) return null;
      
      const user = result.rows[0];
      
      // Añadir métodos al objeto usuario
      return {
        ...user,
        verifyPassword: async (password) => {
          // Implementación básica - reemplaza con bcrypt si lo tienes
          return user.password_hash === password;
        },
        getSafeData: () => {
          const { password_hash, ...safeData } = user;
          return safeData;
        }
      };
    } catch (error) {
      console.error('Error en getUserByUsername:', error);
      return null;
    }
  }

  async getFeaturedReviews() {
    try {
      const result = await this.query(
        `SELECT r.*, u.username 
         FROM reviews r 
         LEFT JOIN users u ON r.user_id = u.id 
         WHERE r.is_featured = TRUE 
         ORDER BY r.created_at DESC 
         LIMIT 5`
      );
      return result.rows;
    } catch (error) {
      console.error('Error en getFeaturedReviews:', error);
      return [];
    }
  }

  // Verificar conexión
  async testConnection() {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      return { success: true, time: result.rows[0].current_time };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DatabaseService();