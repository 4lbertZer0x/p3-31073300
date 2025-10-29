const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Configurar ruta de la base de datos para Render
const getDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return path.join(require('os').tmpdir(), 'cinecriticas.db');
  }
  return path.join(__dirname, '..', 'cinecriticas.db');
};

const dbPath = getDbPath();
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

// ================= MÉTODOS DE USUARIO =================

const getUserByUsername = async (username) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE username = ?', 
      [username],
      (err, row) => {
        if (err) {
          console.error('Error en getUserByUsername:', err);
          reject(err);
        } else {
          if (row) {
            // Agregar método para verificar contraseña
            row.verifyPassword = async (password) => {
              return await bcrypt.compare(password, row.password_hash);
            };
          }
          resolve(row || null);
        }
      }
    );
  });
};

const getUserById = async (id) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE id = ?',
      [id],
      (err, row) => {
        if (err) {
          console.error('Error en getUserById:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
};

const getAllUsers = async () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, username, email, role, created_at 
       FROM users 
       ORDER BY created_at DESC`,
      (err, rows) => {
        if (err) {
          console.error('Error en getAllUsers:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
};

const getUserCount = async () => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM users',
      (err, row) => {
        if (err) {
          console.error('Error en getUserCount:', err);
          reject(err);
        } else {
          resolve(row.count || 0);
        }
      }
    );
  });
};

const createUser = async (userData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { username, email, password_hash, role } = userData;
      const hashedPassword = await bcrypt.hash(password_hash, 10);
      
      db.run(
        `INSERT INTO users (username, email, password_hash, role) 
         VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, role || 'user'],
        function(err) {
          if (err) {
            console.error('Error en createUser:', err);
            reject(err);
          } else {
            // Devolver el usuario creado
            getUserById(this.lastID).then(resolve).catch(reject);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

const updateUser = async (id, userData) => {
  return new Promise((resolve, reject) => {
    const { username, email, role } = userData;
    
    console.log('🔄 Actualizando usuario ID:', id);
    
    db.run(
      `UPDATE users 
       SET username = ?, email = ?, role = ? 
       WHERE id = ?`,
      [username, email, role, id],
      function(err) {
        if (err) {
          console.error('Error en updateUser:', err);
          reject(err);
        } else {
          console.log('✅ Usuario actualizado correctamente');
          getUserById(id).then(resolve).catch(reject);
        }
      }
    );
  });
};

const deleteUser = async (id) => {
  return new Promise((resolve, reject) => {
    console.log('🗑️ Eliminando usuario ID:', id);
    
    db.run(
      'DELETE FROM users WHERE id = ?', 
      [id],
      function(err) {
        if (err) {
          console.error('Error en deleteUser:', err);
          reject(err);
        } else {
          console.log('✅ Usuario eliminado correctamente');
          resolve(true);
        }
      }
    );
  });
};

// ================= MÉTODOS DE RESEÑAS =================

const getReviewById = async (id) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT r.*, u.username 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.id = ?`,
      [id],
      (err, row) => {
        if (err) {
          console.error('Error en getReviewById:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
};

const getFeaturedReviews = async () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT r.*, u.username 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.is_featured = 1 
       ORDER BY r.created_at DESC 
       LIMIT 5`,
      (err, rows) => {
        if (err) {
          console.error('Error en getFeaturedReviews:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
};

const getAllReviews = async () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT r.*, u.username 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       ORDER BY r.created_at DESC`,
      (err, rows) => {
        if (err) {
          console.error('Error en getAllReviews:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
};

const getReviewsByMovie = async (movieTitle) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT r.*, u.username 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.movie_title = ? 
       ORDER BY r.created_at DESC`,
      [movieTitle],
      (err, rows) => {
        if (err) {
          console.error('Error en getReviewsByMovie:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
};

const createReview = async (reviewData) => {
  return new Promise((resolve, reject) => {
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
        reject(new Error('Faltan campos requeridos para crear la reseña'));
        return;
      }

      // Asegurarse de que el rating sea un número válido
      const numericRating = parseInt(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        reject(new Error('La calificación debe ser un número entre 1 y 5'));
        return;
      }

      const query = `
        INSERT INTO reviews (title, content, rating, movie_title, poster_url, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        title.toString().trim(),
        content.toString().trim(),
        numericRating,
        movie_title.toString().trim(),
        poster_url || '/images/default-poster.jpg',
        user_id
      ];

      console.log('📋 Ejecutando INSERT con parámetros:', params);
      
      db.run(query, params, function(err) {
        if (err) {
          console.error('❌ Error en createReview:', err);
          reject(err);
        } else {
          console.log('✅ Reseña creada con ID:', this.lastID);
          getReviewById(this.lastID).then(resolve).catch(reject);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const updateReview = async (id, reviewData) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Actualizando reseña ID:', id);
      
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
        reject(new Error('Faltan campos requeridos: title, content, rating, movie_title'));
        return;
      }

      // Asegurarse de que el rating sea un número válido
      const numericRating = parseInt(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        reject(new Error('La calificación debe ser un número entre 1 y 5'));
        return;
      }

      const query = `
        UPDATE reviews 
        SET title = ?, content = ?, rating = ?, movie_title = ?, 
            poster_url = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const params = [
        title.toString().trim(),
        content.toString().trim(),
        numericRating,
        movie_title.toString().trim(),
        poster_url || '/images/default-poster.jpg',
        is_featured ? 1 : 0,
        id
      ];

      console.log('📋 Ejecutando query:', query);
      console.log('🔢 Parámetros:', params);
      
      db.run(query, params, function(err) {
        if (err) {
          console.error('❌ Error en updateReview:', err);
          reject(err);
        } else {
          console.log('✅ Reseña actualizada correctamente');
          getReviewById(id).then(resolve).catch(reject);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const deleteReview = async (id) => {
  return new Promise((resolve, reject) => {
    console.log('🗑️ Eliminando reseña ID:', id);
    
    db.run(
      'DELETE FROM reviews WHERE id = ?', 
      [id],
      function(err) {
        if (err) {
          console.error('Error en deleteReview:', err);
          reject(err);
        } else {
          console.log('✅ Reseña eliminada correctamente');
          resolve(true);
        }
      }
    );
  });
};

// ================= MÉTODOS UTILITARIOS =================

const testConnection = async () => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT datetime("now") as current_time',
      (err, row) => {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ 
            success: true, 
            time: row.current_time,
            type: 'SQLite',
            path: dbPath
          });
        }
      }
    );
  });
};

// ================= INICIALIZACIÓN DE DATOS =================

const seedInitialData = async () => {
  try {
    const userCount = await getUserCount();
    
    if (userCount === 0) {
      console.log('🌱 Insertando datos iniciales...');
      
      // Crear usuario admin
      await createUser({
        username: 'admin',
        email: 'admin@cinecriticas.com',
        password_hash: 'admin123',
        role: 'admin'
      });

      // Crear usuario normal
      await createUser({
        username: 'usuario',
        email: 'usuario@cinecriticas.com',
        password_hash: 'password123',
        role: 'user'
      });

      // Crear reseñas de ejemplo
      await createReview({
        title: 'Increíble película de acción',
        content: 'Efectos especiales impresionantes y trama emocionante.',
        rating: 5,
        movie_title: 'Avengers: Endgame',
        poster_url: '/images/default-poster.jpg',
        user_id: 1
      });

      await createReview({
        title: 'Una obra maestra del drama',
        content: 'Actuaciones conmovedoras y una historia que te atrapa.',
        rating: 5,
        movie_title: 'The Shawshank Redemption',
        poster_url: '/images/default-poster.jpg',
        user_id: 2
      });

      console.log('✅ Datos iniciales insertados correctamente');
      console.log('👤 Usuario admin: admin / admin123');
      console.log('👤 Usuario normal: usuario / password123');
    } else {
      console.log('✅ Base de datos ya tiene datos, omitiendo inserción');
    }
  } catch (error) {
    console.log('⚠️  Error insertando datos iniciales:', error.message);
  }
};

// Exportar todos los métodos
module.exports = {
  initializeDB,
  testConnection,
  
  // Métodos de usuario
  getUserByUsername,
  getUserById,
  getAllUsers,
  getUserCount,
  createUser,
  updateUser,
  deleteUser,
  
  // Métodos de reseñas
  getReviewById,
  getFeaturedReviews,
  getAllReviews,
  getReviewsByMovie,
  createReview,
  updateReview,
  deleteReview,
  
  // Inicialización
  seedInitialData
};