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

// ================= INICIALIZACIÓN DE LA BASE DE DATOS =================

const initializeDB = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Inicializando base de datos...');
      
      // Crear directorio si no existe
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Error conectando a SQLite:', err.message);
          reject(err);
        } else {
          console.log('✅ Conectado a la base de datos SQLite');
          createTables()
            .then(() => seedInitialMovies())
            .then(() => seedInitialData())
            .then(resolve)
            .catch(reject);
        }
      });
    } catch (error) {
      console.error('❌ Error en initializeDB:', error);
      reject(error);
    }
  });
};

// ================= CREACIÓN DE TABLAS =================

const createTables = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    console.log('🗂️ Creando tablas...');

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

    const moviesTable = `
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT UNIQUE NOT NULL,
        year TEXT NOT NULL,
        genre TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'movie',
        poster_url TEXT DEFAULT '/images/default-poster.jpg',
        is_active BOOLEAN DEFAULT 1,
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

    // Ejecutar en serie para evitar problemas de concurrencia
    db.run(usersTable, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('✅ Tabla users creada/verificada');

      db.run(moviesTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('✅ Tabla movies creada/verificada');

        db.run(reviewsTable, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('✅ Tabla reviews creada/verificada');
          console.log('✅ Todas las tablas creadas/verificadas correctamente');
          resolve();
        });
      });
    });
  });
};

// ================= MÉTODOS DE PELÍCULAS =================

const getAllMovies = async () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    db.all(
      `SELECT * FROM movies WHERE is_active = 1 ORDER BY title ASC`,
      (err, rows) => {
        if (err) {
          console.error('Error en getAllMovies:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
};

const getMovieById = async (id) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    db.get(
      'SELECT * FROM movies WHERE id = ?',
      [id],
      (err, row) => {
        if (err) {
          console.error('Error en getMovieById:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
};

const createMovie = async (movieData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    try {
      const { title, year, genre, description, type, poster_url } = movieData;
      
      console.log('🆕 Creando nueva película/serie:', title);
      
      const query = `
        INSERT INTO movies (title, year, genre, description, type, poster_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        title.toString().trim(),
        year.toString().trim(),
        genre.toString().trim(),
        description ? description.toString().trim() : null,
        type || 'movie',
        poster_url || '/images/default-poster.jpg'
      ];

      db.run(query, params, function(err) {
        if (err) {
          console.error('❌ Error en createMovie:', err);
          reject(err);
        } else {
          console.log('✅ Película/Serie creada con ID:', this.lastID);
          getMovieById(this.lastID).then(resolve).catch(reject);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const updateMovie = async (id, movieData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    try {
      const { title, year, genre, description, type, poster_url, is_active } = movieData;
      
      console.log('🔄 Actualizando película ID:', id);
      
      const query = `
        UPDATE movies 
        SET title = ?, year = ?, genre = ?, description = ?, type = ?, poster_url = ?, is_active = ?
        WHERE id = ?
      `;
      
      const params = [
        title.toString().trim(),
        year.toString().trim(),
        genre.toString().trim(),
        description ? description.toString().trim() : null,
        type || 'movie',
        poster_url || '/images/default-poster.jpg',
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        id
      ];

      db.run(query, params, function(err) {
        if (err) {
          console.error('❌ Error en updateMovie:', err);
          reject(err);
        } else {
          console.log('✅ Película actualizada correctamente');
          getMovieById(id).then(resolve).catch(reject);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const deleteMovie = async (id) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    console.log('🗑️ Eliminando película ID:', id);
    
    // En lugar de eliminar, marcamos como inactiva
    db.run(
      'UPDATE movies SET is_active = 0 WHERE id = ?', 
      [id],
      function(err) {
        if (err) {
          console.error('Error en deleteMovie:', err);
          reject(err);
        } else {
          console.log('✅ Película marcada como inactiva');
          resolve(true);
        }
      }
    );
  });
};

// ================= DATOS INICIALES DE PELÍCULAS =================

const seedInitialMovies = async () => {
  if (!db) {
    console.log('❌ Base de datos no disponible para seedInitialMovies');
    return;
  }

  try {
    const moviesCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM movies', (err, row) => {
        if (err) reject(err);
        else resolve(row.count || 0);
      });
    });
    
    if (moviesCount === 0) {
      console.log('🎬 Insertando películas y series iniciales...');
      
      const initialMovies = [
        {
          title: 'Avengers: Endgame',
          year: '2019',
          genre: 'Acción, Aventura, Ciencia Ficción',
          description: 'Los Vengadores restantes deben encontrar una manera de recuperar a sus aliados para un enfrentamiento épico con Thanos.',
          type: 'movie'
        },
        {
          title: 'The Shawshank Redemption',
          year: '1994',
          genre: 'Drama',
          description: 'Dos hombres encarcelados establecen un vínculo a lo largo de varios años, encontrando consuelo y eventual redención a través de actos de decencia común.',
          type: 'movie'
        },
        {
          title: 'The Godfather',
          year: '1972',
          genre: 'Crimen, Drama',
          description: 'El patriarca envejecimiento de una dinastía del crimen organizado transfiere el control de su imperio clandestino a su hijo reacio.',
          type: 'movie'
        },
        {
          title: 'The Dark Knight',
          year: '2008',
          genre: 'Acción, Crimen, Drama',
          description: 'Batman tiene que aceptar una de las pruebas psicológicas y físicas más grandes para luchar contra el Joker.',
          type: 'movie'
        },
        {
          title: 'Pulp Fiction',
          year: '1994',
          genre: 'Crimen, Drama',
          description: 'Las vidas de dos matones, un boxeador y un par de bandidos se entrelazan en cuatro historias de violencia y redención.',
          type: 'movie'
        },
        {
          title: 'Forrest Gump',
          year: '1994',
          genre: 'Drama, Romance',
          description: 'Las presidencias de Kennedy y Johnson, Vietnam, Watergate y otros history se desarrollan desde la perspectiva de un hombre de Alabama.',
          type: 'movie'
        },
        {
          title: 'Inception',
          year: '2010',
          genre: 'Acción, Ciencia Ficción, Thriller',
          description: 'Un ladrón que roba secretos corporativos mediante el uso de tecnología para compartir sueños tiene la tarea inversa de plantar una idea en la mente de un CEO.',
          type: 'movie'
        },
        {
          title: 'The Matrix',
          year: '1999',
          genre: 'Acción, Ciencia Ficción',
          description: 'Un programador es llevado a una guerra rebelde contra las máquinas que han esclavizado la humanidad.',
          type: 'movie'
        },
        {
          title: 'Goodfellas',
          year: '1990',
          genre: 'Biografía, Crimen, Drama',
          description: 'La historia de Henry Hill y su vida en la mafia, cubriendo su relación con su esposa y su partera.',
          type: 'movie'
        },
        {
          title: 'Fight Club',
          year: '1999',
          genre: 'Drama',
          description: 'Un oficinista insomne y un fabricante de jabón forman un club de lucha subterráneo que evoluciona hacia algo mucho más grande.',
          type: 'movie'
        },
        {
          title: 'Breaking Bad',
          year: '2008-2013',
          genre: 'Crimen, Drama, Thriller',
          description: 'Un profesor de química con cáncer terminal se asocia con un exalumno para asegurar el futuro de su familia fabricando metanfetamina.',
          type: 'series'
        },
        {
          title: 'Game of Thrones',
          year: '2011-2019',
          genre: 'Aventura, Drama, Fantasía',
          description: 'Nobles familias luchan por el control del Trono de Hierro en las tierras de Westeros.',
          type: 'series'
        },
        {
          title: 'Stranger Things',
          year: '2016-2025',
          genre: 'Drama, Fantasía, Terror',
          description: 'Cuando un niño desaparece, una pequeña ciudad descubre un misterio que involucra experimentos secretos y fuerzas sobrenaturales.',
          type: 'series'
        },
        {
          title: 'The Crown',
          year: '2016-2023',
          genre: 'Drama, Historia',
          description: 'Sigue el reinado de la Reina Isabel II y los eventos que dieron forma a la segunda mitad del siglo XX.',
          type: 'series'
        }
      ];
      
      for (const movie of initialMovies) {
        try {
          await createMovie(movie);
        } catch (error) {
          console.log(`⚠️  Error creando ${movie.title}:`, error.message);
        }
      }
      
      console.log(`✅ ${initialMovies.length} películas/series iniciales insertadas`);
    } else {
      console.log(`✅ Ya existen ${moviesCount} películas en la base de datos`);
    }
  } catch (error) {
    console.log('⚠️  Error insertando películas iniciales:', error.message);
  }
};

// ================= MÉTODOS DE USUARIO =================

const getUserByUsername = async (username) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    db.get(
      'SELECT * FROM users WHERE username = ?', 
      [username],
      (err, row) => {
        if (err) {
          console.error('Error en getUserByUsername:', err);
          reject(err);
        } else {
          if (row) {
            console.log(`🔍 Usuario encontrado: ${row.username}, hash: ${row.password_hash.substring(0, 20)}...`);
            
            // Agregar método para verificar contraseña
            row.verifyPassword = async (password) => {
              try {
                console.log(`🔐 Comparando: "${password}" con hash de ${row.username}`);
                const isValid = await bcrypt.compare(password, row.password_hash);
                console.log(`✅ Resultado comparación para ${row.username}: ${isValid}`);
                return isValid;
              } catch (error) {
                console.error('❌ Error comparando contraseñas:', error);
                return false;
              }
            };
          } else {
            console.log(`❌ Usuario no encontrado: ${username}`);
          }
          resolve(row || null);
        }
      }
    );
  });
};

const getUserById = async (id) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    try {
      const { username, email, password_hash, role } = userData;
      
      console.log(`🆕 Intentando crear usuario: ${username}, ${email}`);
      
      // Verificar si el usuario ya existe
      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        reject(new Error(`El usuario '${username}' ya existe`));
        return;
      }
      
      // Verificar si el email ya existe
      const existingEmail = await new Promise((resolve) => {
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
          if (err) {
            resolve(false);
          } else {
            resolve(!!row);
          }
        });
      });
      
      if (existingEmail) {
        reject(new Error(`El email '${email}' ya está registrado`));
        return;
      }
      
      // Asegurarse de que password_hash ya esté hasheado
      let hashedPassword;
      if (password_hash.startsWith('$2b$') || password_hash.startsWith('$2a$')) {
        // Ya está hasheado
        hashedPassword = password_hash;
        console.log(`🔐 Password ya hasheado para ${username}`);
      } else {
        // Necesita hashing
        hashedPassword = await bcrypt.hash(password_hash, 10);
        console.log(`🔐 Password hasheado para ${username}`);
      }
      
      db.run(
        `INSERT INTO users (username, email, password_hash, role) 
         VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, role || 'user'],
        function(err) {
          if (err) {
            console.error('❌ Error en createUser:', err.message);
            reject(err);
          } else {
            console.log(`✅ Usuario creado con ID: ${this.lastID}`);
            getUserById(this.lastID).then(resolve).catch(reject);
          }
        }
      );
    } catch (error) {
      console.error('❌ Error en createUser:', error.message);
      reject(error);
    }
  });
};

const updateUser = async (id, userData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

    try {
      console.log('🆕 Creando nueva reseña:', reviewData);
      
      const {
        title,
        content,
        rating,
        movie_title,
        poster_url,
        user_id,
        is_featured = false
      } = reviewData;

      if (!title || !content || !rating || !movie_title || !user_id) {
        reject(new Error('Faltan campos requeridos para crear la reseña'));
        return;
      }

      const numericRating = parseInt(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        reject(new Error('La calificación debe ser un número entre 1 y 5'));
        return;
      }

      const query = `
        INSERT INTO reviews (title, content, rating, movie_title, poster_url, user_id, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        title.toString().trim(),
        content.toString().trim(),
        numericRating,
        movie_title.toString().trim(),
        poster_url || '/images/default-poster.jpg',
        user_id,
        is_featured ? 1 : 0
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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      reject(new Error('Base de datos no inicializada'));
      return;
    }

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
    if (!db) {
      resolve({ success: false, error: 'Base de datos no inicializada' });
      return;
    }

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
  if (!db) {
    console.log('❌ Base de datos no disponible para seedInitialData');
    return;
  }

  try {
    const userCount = await getUserCount();
    
    if (userCount === 0) {
      console.log('🌱 Insertando datos iniciales...');
      
      try {
        // Crear usuario admin - CORREGIDO
        const adminHashedPassword = await bcrypt.hash('admin123', 10);
        await createUser({
          username: 'admin',
          email: 'admin@cinecriticas.com',
          password_hash: adminHashedPassword,
          role: 'admin'
        });
        console.log('✅ Usuario admin creado');
      } catch (error) {
        console.log('⚠️  Error creando admin:', error.message);
      }

      try {
        // Crear usuario normal - CORREGIDO
        const userHashedPassword = await bcrypt.hash('password123', 10);
        await createUser({
          username: 'usuario',
          email: 'usuario@ejemplo.com',
          password_hash: userHashedPassword,
          role: 'user'
        });
        console.log('✅ Usuario normal creado');
      } catch (error) {
        console.log('⚠️  Error creando usuario normal:', error.message);
      }

      try {
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

        console.log('✅ Reseñas de ejemplo creadas');
      } catch (error) {
        console.log('⚠️  Error creando reseñas:', error.message);
      }

      console.log('✅ Datos iniciales insertados correctamente');
      console.log('👤 Usuario admin: admin / admin123');
      console.log('👤 Usuario normal: usuario / password123');
    } else {
      console.log('✅ Base de datos ya tiene datos, omitiendo inserción');
      const users = await getAllUsers();
      console.log(`📊 Usuarios existentes: ${users.length}`);
    }
  } catch (error) {
    console.log('⚠️  Error insertando datos iniciales:', error.message);
  }
};

// Función para verificar y crear usuarios de prueba
const ensureTestUsers = async () => {
  try {
    console.log('🔍 Verificando usuarios de prueba...');
    
    const createTestUser = async (username, email, password, role) => {
      try {
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
          console.log(`✅ ${role} ya existe: ${username}`);
          return true;
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await createUser({
          username,
          email,
          password_hash: hashedPassword,
          role
        });
        console.log(`✅ ${role} creado: ${username} / ${password}`);
        return true;
      } catch (error) {
        console.log(`⚠️  Error creando ${username}:`, error.message);
        return false;
      }
    };

    // Crear usuarios de prueba
    const adminCreated = await createTestUser('admin', 'admin@cinecriticas.com', 'admin123', 'admin');
    const userCreated = await createTestUser('usuario', 'usuario@ejemplo.com', 'password123', 'user');
    
    console.log('\n🔐 Estado de usuarios de prueba:');
    if (adminCreated) {
      console.log('   👑 Administrador: admin / admin123');
    }
    if (userCreated) {
      console.log('   👤 Usuario normal: usuario / password123');
    }
    
    return { adminCreated, userCreated };
  } catch (error) {
    console.error('❌ Error en ensureTestUsers:', error.message);
    return { adminCreated: false, userCreated: false };
  }
};

// Función para obtener información de debug
const getDebugInfo = async () => {
  try {
    const users = await getAllUsers();
    const reviews = await getAllReviews();
    
    return {
      database: {
        path: dbPath,
        usersCount: users.length,
        reviewsCount: reviews.length
      },
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      })),
      reviews: reviews.map(review => ({
        id: review.id,
        title: review.title,
        movie_title: review.movie_title,
        rating: review.rating,
        user_id: review.user_id,
        username: review.username,
        is_featured: review.is_featured
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
};

// Función para debug de contraseñas
const debugPasswords = async () => {
  try {
    const users = await getAllUsers();
    const debugResults = await Promise.all(
      users.map(async (user) => {
        const testAdmin = await bcrypt.compare('admin123', user.password_hash);
        const testUser = await bcrypt.compare('password123', user.password_hash);
        
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          password_hash: user.password_hash.substring(0, 20) + '...',
          test_admin123: testAdmin,
          test_password123: testUser,
          hash_length: user.password_hash.length
        };
      })
    );
    
    return {
      message: 'Debug de contraseñas',
      users: debugResults
    };
  } catch (error) {
    return { error: error.message };
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

  // Métodos de películas
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  
  // Inicialización
  seedInitialData,
  ensureTestUsers,
  getDebugInfo,
  debugPasswords
};