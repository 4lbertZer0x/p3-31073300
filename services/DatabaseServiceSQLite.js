// services/DatabaseServiceSQLite.js - VERSIÓN COMPLETA CON MIGRACIÓN ROBUSTA
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Configurar ruta de la base de datos para Render
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(require('os').tmpdir(), 'cinecriticas.db')
  : path.join(__dirname, '..', 'cinecriticas.db');

console.log('📁 Ruta de base de datos:', dbPath);

let db = null;

const initializeDB = () => {
  return new Promise((resolve, reject) => {
    try {
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Error conectando a SQLite:', err.message);
          reject(err);
        } else {
          console.log('✅ Conectado a la base de datos SQLite');
          createTables().then(resolve).catch(reject);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    const usersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const reviewsTable = `
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        movie_title TEXT NOT NULL,
        poster_url TEXT DEFAULT '/images/default-poster.jpg',
        is_featured BOOLEAN DEFAULT 0,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    db.run(usersTable, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.run(reviewsTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('✅ Tablas creadas/verificadas correctamente');
        resolve();
      });
    });
  });
};

// ... (el resto del código del DatabaseService se mantiene igual)
// Solo asegúrate de que todas las funciones usen la misma conexión db
class DatabaseServiceSQLite {
  constructor() {
    this.db = null;
    this.dbPath = process.env.NODE_ENV === 'production' 
      ? '/tmp/cinecriticas.db'
      : path.join(__dirname, '..', 'database.db');
  }

  async connect() {
    try {
      console.log('🔧 Inicializando SQLite...');
      console.log('📁 Ruta de base de datos:', this.dbPath);
      
      // En producción (Vercel), /tmp ya existe
      if (process.env.NODE_ENV !== 'production') {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });
      
      console.log('✅ Conectado a SQLite correctamente');
      
      // Crear tablas básicas
      await this.createTables();
      
      // FORZAR migración de columnas
      await this.forceMigrateColumns();
      
      await this.seedData();
      return true;
    } catch (error) {
      console.error('❌ Error conectando a SQLite:', error);
      return false;
    }
  }

  async createTables() {
    try {
      // Tabla de usuarios
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de reseñas
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          movie_title VARCHAR(200) NOT NULL,
          poster_url VARCHAR(500) DEFAULT '/images/default-poster.jpg',
          user_id INTEGER REFERENCES users(id),
          is_featured BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ Tablas de SQLite creadas/verificadas');
      
    } catch (error) {
      console.error('❌ Error creando tablas SQLite:', error);
    }
  }

  async forceMigrateColumns() {
    try {
      console.log('🔄 FORZANDO migración de columnas...');
      
      // Agregar poster_url si no existe (sin verificar primero)
      try {
        await this.db.exec('ALTER TABLE reviews ADD COLUMN poster_url VARCHAR(500) DEFAULT "/images/default-poster.jpg"');
        console.log('✅ Columna poster_url agregada/verificada');
      } catch (error) {
        console.log('ℹ️  poster_url probablemente ya existe:', error.message);
      }
      
      // Agregar updated_at si no existe (sin verificar primero)
      try {
        await this.db.exec('ALTER TABLE reviews ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Columna updated_at agregada/verificada');
      } catch (error) {
        console.log('ℹ️  updated_at probablemente ya existe:', error.message);
      }
      
      // Actualizar datos existentes
      try {
        await this.db.run(`UPDATE reviews SET poster_url = '/images/default-poster.jpg' WHERE poster_url IS NULL`);
        await this.db.run(`UPDATE reviews SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);
        console.log('✅ Datos existentes actualizados');
      } catch (error) {
        console.log('ℹ️  Info actualización datos:', error.message);
      }
      
    } catch (error) {
      console.log('❌ Error en migración forzada:', error.message);
    }
  }

  async seedData() {
    try {
      const userCount = await this.db.get('SELECT COUNT(*) as count FROM users');
      
      if (userCount.count === 0) {
        console.log('🌱 Insertando datos de ejemplo...');
        
        // Hash de contraseñas
        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('password123', 10);
        
        // Insertar usuario admin
        await this.db.run(
          `INSERT INTO users (username, email, password_hash, role) 
           VALUES (?, ?, ?, ?)`,
          ['admin', 'admin@cinecriticas.com', adminPassword, 'admin']
        );

        // Insertar usuario normal
        await this.db.run(
          `INSERT INTO users (username, email, password_hash, role) 
           VALUES (?, ?, ?, ?)`,
          ['usuario', 'usuario@cinecriticas.com', userPassword, 'user']
        );

        // Insertar reseñas de ejemplo CON poster_url
        await this.db.run(
          `INSERT INTO reviews (title, content, rating, movie_title, poster_url, user_id, is_featured) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            'Increíble película de acción', 
            'Efectos especiales impresionantes y trama emocionante. Una experiencia cinematográfica única.', 
            5, 
            'Avengers: Endgame',
            '/images/default-poster.jpg',
            1, 
            1
          ]
        );

        await this.db.run(
          `INSERT INTO reviews (title, content, rating, movie_title, poster_url, user_id, is_featured) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            'Una obra maestra del drama', 
            'Actuaciones conmovedoras y una historia que te atrapa desde el primer minuto.', 
            5, 
            'The Shawshank Redemption',
            '/images/default-poster.jpg',
            2, 
            1
          ]
        );

        await this.db.run(
          `INSERT INTO reviews (title, content, rating, movie_title, poster_url, user_id) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            'Divertida y original', 
            'Comedia inteligente con personajes memorables. Perfecta para una noche de cine.', 
            4, 
            'Spider-Man: Into the Spider-Verse',
            '/images/default-poster.jpg',
            1
          ]
        );

        console.log('✅ Datos de ejemplo insertados correctamente');
        console.log('👤 Usuario admin: admin / admin123');
        console.log('👤 Usuario normal: usuario / password123');
      } else {
        console.log('✅ Base de datos ya tiene datos, omitiendo inserción');
      }
    } catch (error) {
      console.log('⚠️  Error insertando datos de ejemplo:', error.message);
    }
  }

  // ================= MÉTODOS DE USUARIO =================

  async getUserByUsername(username) {
    try {
      const user = await this.db.get(
        'SELECT * FROM users WHERE username = ?', 
        [username]
      );
      
      if (!user) return null;
      
      // Agregar métodos al objeto usuario
      user.verifyPassword = async (password) => {
        return await bcrypt.compare(password, user.password_hash);
      };
      
      user.getSafeData = () => {
        const { password_hash, ...safeData } = user;
        return safeData;
      };
      
      return user;
    } catch (error) {
      console.error('Error en getUserByUsername:', error);
      return null;
    }
  }

  async getUserById(id) {
    try {
      const user = await this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return user || null;
    } catch (error) {
      console.error('Error en getUserById:', error);
      return null;
    }
  }

  async getAllUsers() {
    try {
      const users = await this.db.all(
        `SELECT id, username, email, role, created_at 
         FROM users 
         ORDER BY created_at DESC`
      );
      return users;
    } catch (error) {
      console.error('Error en getAllUsers:', error);
      return [];
    }
  }

  async getUserCount() {
    try {
      const result = await this.db.get('SELECT COUNT(*) as count FROM users');
      return result.count;
    } catch (error) {
      console.error('Error en getUserCount:', error);
      return 0;
    }
  }

  async createUser(userData) {
    try {
      const { username, email, password_hash, role } = userData;
      const hashedPassword = await bcrypt.hash(password_hash, 10);
      
      const result = await this.db.run(
        `INSERT INTO users (username, email, password_hash, role) 
         VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, role || 'user']
      );
      
      // Devolver el usuario creado
      return await this.getUserById(result.lastID);
    } catch (error) {
      console.error('Error en createUser:', error);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      const { username, email, role } = userData;
      
      console.log('🔄 Actualizando usuario ID:', id);
      console.log('📊 Datos a actualizar:', userData);
      
      await this.db.run(
        `UPDATE users 
         SET username = ?, email = ?, role = ? 
         WHERE id = ?`,
        [username, email, role, id]
      );
      
      console.log('✅ Usuario actualizado correctamente');
      return await this.getUserById(id);
    } catch (error) {
      console.error('Error en updateUser:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      console.log('🗑️ Eliminando usuario ID:', id);
      await this.db.run('DELETE FROM users WHERE id = ?', [id]);
      console.log('✅ Usuario eliminado correctamente');
      return true;
    } catch (error) {
      console.error('Error en deleteUser:', error);
      throw error;
    }
  }

  // ================= MÉTODOS DE RESEÑAS =================

  async getReviewById(id) {
    try {
      const review = await this.db.get(
        `SELECT r.*, u.username 
         FROM reviews r 
         LEFT JOIN users u ON r.user_id = u.id 
         WHERE r.id = ?`,
        [id]
      );
      return review || null;
    } catch (error) {
      console.error('Error en getReviewById:', error);
      return null;
    }
  }

  async getFeaturedReviews() {
    try {
      const reviews = await this.db.all(
        `SELECT r.*, u.username 
         FROM reviews r 
         LEFT JOIN users u ON r.user_id = u.id 
         WHERE r.is_featured = 1 
         ORDER BY r.created_at DESC 
         LIMIT 5`
      );
      return reviews;
    } catch (error) {
      console.error('Error en getFeaturedReviews:', error);
      return [];
    }
  }

  async getAllReviews() {
    try {
      const reviews = await this.db.all(
        `SELECT r.*, u.username 
         FROM reviews r 
         LEFT JOIN users u ON r.user_id = u.id 
         ORDER BY r.created_at DESC`
      );
      return reviews;
    } catch (error) {
      console.error('Error en getAllReviews:', error);
      return [];
    }
  }

  async getReviewsByMovie(movieTitle) {
    try {
      const reviews = await this.db.all(
        `SELECT r.*, u.username 
         FROM reviews r 
         LEFT JOIN users u ON r.user_id = u.id 
         WHERE r.movie_title = ? 
         ORDER BY r.created_at DESC`,
        [movieTitle]
      );
      return reviews;
    } catch (error) {
      console.error('Error en getReviewsByMovie:', error);
      return [];
    }
  }

  async createReview(reviewData) {
    try {
      console.log('🆕 Creando nueva reseña:', reviewData);
      
      const {
        title,
        content,
        rating,
        movie_title,
        poster_url,
        user_id
      } = reviewData;

      // Validar campos requeridos
      if (!title || !content || !rating || !movie_title || !user_id) {
        throw new Error('Faltan campos requeridos para crear la reseña');
      }

      // Asegurarse de que el rating sea un número válido
      const numericRating = parseInt(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        throw new Error('La calificación debe ser un número entre 1 y 5');
      }

      // Verificar si las columnas adicionales existen
      const tableInfo = await this.db.all("PRAGMA table_info(reviews)");
      const hasPosterUrl = tableInfo.some(col => col.name === 'poster_url');
      const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');

      let query, params;

      if (hasPosterUrl && hasUpdatedAt) {
        query = `
          INSERT INTO reviews (title, content, rating, movie_title, poster_url, user_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        params = [
          title.toString().trim(),
          content.toString().trim(),
          numericRating,
          movie_title.toString().trim(),
          poster_url || '/images/default-poster.jpg',
          user_id
        ];
      } else if (hasPosterUrl) {
        query = `
          INSERT INTO reviews (title, content, rating, movie_title, poster_url, user_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        params = [
          title.toString().trim(),
          content.toString().trim(),
          numericRating,
          movie_title.toString().trim(),
          poster_url || '/images/default-poster.jpg',
          user_id
        ];
      } else {
        query = `
          INSERT INTO reviews (title, content, rating, movie_title, user_id, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        params = [
          title.toString().trim(),
          content.toString().trim(),
          numericRating,
          movie_title.toString().trim(),
          user_id
        ];
      }

      console.log('📋 Ejecutando INSERT con parámetros:', params);
      
      const result = await this.db.run(query, params);
      
      console.log('✅ Reseña creada con ID:', result.lastID);
      return await this.getReviewById(result.lastID);
    } catch (error) {
      console.error('❌ Error en createReview:', error);
      throw error;
    }
  }

  async updateReview(id, reviewData) {
    try {
      console.log('🔄 Actualizando reseña ID:', id);
      console.log('📊 Datos a actualizar:', reviewData);
      
      const {
        title,
        content,
        rating,
        movie_title,
        poster_url,
        is_featured = false
      } = reviewData;

      // Validar que los campos requeridos estén presentes
      if (!title || !content || !rating || !movie_title) {
        throw new Error('Faltan campos requeridos: title, content, rating, movie_title');
      }

      // Asegurarse de que el rating sea un número válido
      const numericRating = parseInt(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        throw new Error('La calificación debe ser un número entre 1 y 5');
      }

      // PRIMERO: Verificar si la columna updated_at existe
      let hasUpdatedAt = false;
      try {
        const tableInfo = await this.db.all("PRAGMA table_info(reviews)");
        hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
        console.log('📋 ¿Columna updated_at existe?:', hasUpdatedAt);
      } catch (error) {
        console.log('⚠️  No se pudo verificar la estructura de la tabla:', error.message);
      }

      // Query dinámico basado en la existencia de updated_at
      let query, params;
      
      if (hasUpdatedAt) {
        query = `
          UPDATE reviews 
          SET title = ?, content = ?, rating = ?, movie_title = ?, 
              poster_url = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        params = [
          title.toString().trim(),
          content.toString().trim(),
          numericRating,
          movie_title.toString().trim(),
          poster_url || '/images/default-poster.jpg',
          is_featured ? 1 : 0,
          id
        ];
      } else {
        query = `
          UPDATE reviews 
          SET title = ?, content = ?, rating = ?, movie_title = ?, 
              poster_url = ?, is_featured = ?
          WHERE id = ?
        `;
        params = [
          title.toString().trim(),
          content.toString().trim(),
          numericRating,
          movie_title.toString().trim(),
          poster_url || '/images/default-poster.jpg',
          is_featured ? 1 : 0,
          id
        ];
      }

      console.log('📋 Ejecutando query:', query);
      console.log('🔢 Parámetros:', params);
      
      const result = await this.db.run(query, params);
      
      console.log('✅ Reseña actualizada correctamente');
      return await this.getReviewById(id);
    } catch (error) {
      console.error('❌ Error en updateReview:', error);
      throw error;
    }
  }

  async deleteReview(id) {
    try {
      console.log('🗑️ Eliminando reseña ID:', id);
      
      // Obtener la reseña antes de eliminarla para borrar la imagen si es necesario
      const review = await this.getReviewById(id);
      
      // Eliminar la imagen asociada si existe y no es la default (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production' && review && review.poster_url && !review.poster_url.includes('default-poster')) {
        const imagePath = path.join(__dirname, '..', 'public', review.poster_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log('🗑️ Imagen eliminada:', review.poster_url);
        }
      }
      
      await this.db.run('DELETE FROM reviews WHERE id = ?', [id]);
      console.log('✅ Reseña eliminada correctamente');
      return true;
    } catch (error) {
      console.error('Error en deleteReview:', error);
      throw error;
    }
  }

  async toggleFeaturedReview(id) {
    try {
      const review = await this.getReviewById(id);
      if (!review) throw new Error('Reseña no encontrada');
      
      const newFeaturedState = review.is_featured ? 0 : 1;
      await this.db.run(
        'UPDATE reviews SET is_featured = ? WHERE id = ?',
        [newFeaturedState, id]
      );
      
      console.log(`✅ Reseña ${id} marcada como ${newFeaturedState === 1 ? 'destacada' : 'no destacada'}`);
      return { is_featured: newFeaturedState === 1 };
    } catch (error) {
      console.error('Error en toggleFeaturedReview:', error);
      throw error;
    }
  }

  async getAllMovies() {
    try {
      const movies = await this.db.all(
        `SELECT DISTINCT movie_title, 
                COUNT(*) as review_count,
                AVG(rating) as avg_rating,
                MAX(created_at) as latest_review
         FROM reviews 
         GROUP BY movie_title 
         ORDER BY review_count DESC, latest_review DESC`
      );
      return movies;
    } catch (error) {
      console.error('Error en getAllMovies:', error);
      return [];
    }
  }

  // ================= MÉTODOS UTILITARIOS =================

  async query(sql, params = []) {
    try {
      console.log('📊 Ejecutando query:', sql.substring(0, 100) + '...');
      console.log('📋 Parámetros:', params);
      
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const result = await this.db.all(sql, params);
        console.log('✅ Query SELECT ejecutada, resultados:', result.length);
        return result;
      } else {
        const result = await this.db.run(sql, params);
        console.log('✅ Query ejecutada, cambios:', result.changes);
        return { rows: [], rowCount: result.changes, lastID: result.lastID };
      }
    } catch (error) {
      console.error('❌ Error en query SQLite:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const result = await this.db.get('SELECT datetime("now") as current_time');
      return { 
        success: true, 
        time: result.current_time,
        type: 'SQLite',
        path: this.dbPath
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Método para cerrar la conexión
  async close() {
    try {
      if (this.db) {
        await this.db.close();
        console.log('✅ Conexión a SQLite cerrada');
      }
    } catch (error) {
      console.error('Error cerrando conexión SQLite:', error);
    }
  }
}

module.exports = new DatabaseServiceSQLite();