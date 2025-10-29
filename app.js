// app.js - VERSIÓN ACTUALIZADA Y OPTIMIZADA
console.log('🚀 Iniciando CineCríticas...');

// Configuración
const isProduction = process.env.NODE_ENV === 'production';

console.log('=== CINECRITICAS ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || 3000);
console.log('=== INICIANDO ===');

// Solo usar dotenv en desarrollo local
if (!isProduction) {
  try {
    require('dotenv').config();
    console.log('🔧 Development mode with dotenv');
  } catch (error) {
    console.log('⚠️  dotenv not available');
  }
}

const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

// Importar servicios SQLite
const { initializeDatabase } = require('./models');
const DatabaseService = require('./services/DatabaseServiceSQLite');

const app = express();

// PUERTO
const PORT = process.env.PORT || 3000;

// ================= CONFIGURACIÓN MULTER =================
// ================= CONFIGURACIÓN MULTER =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads', 'reviews');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    // CORREGIDO: Mejor validación de tipos de archivo
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, JPG, PNG, GIF)'));
    }
  }
});



// ================= CONFIGURACIÓN EXPRESS =================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesión
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'cinecriticas-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000
  }
};

if (isProduction) {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));

// Middleware para user global
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// ================= MIDDLEWARES DE AUTENTICACIÓN =================
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Acceso Denegado',
      message: 'No tienes permisos de administrador.',
      user: req.session.user
    });
  }
  next();
};

// ================= RUTAS PÚBLICAS =================

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta principal
app.get('/', async (req, res) => {
  try {
    const featuredReviews = await DatabaseService.getFeaturedReviews();
    const allReviews = await DatabaseService.getAllReviews();
    
    res.render('index', {
      title: 'Inicio - CineCríticas',
      featuredReviews: featuredReviews || [],
      allReviews: allReviews || [],
      user: req.session.user
    });
  } catch (error) {
    console.error('Error en página principal:', error);
    res.render('index', {
      title: 'Inicio - CineCríticas',
      featuredReviews: [],
      allReviews: [],
      user: req.session.user
    });
  }
});

// Ruta para ver reseña individual
app.get('/review/:id', async (req, res) => {
  try {
    const review = await DatabaseService.getReviewById(req.params.id);
    
    if (!review) {
      return res.status(404).render('404', {
        title: 'Reseña No Encontrada',
        user: req.session.user
      });
    }

    res.render('review-template', {
      title: `${review.movie_title} - CineCríticas`,
      review: review,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error cargando reseña:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar la reseña.',
      user: req.session.user
    });
  }
});

// ================= AUTENTICACIÓN =================

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', {
    title: 'Iniciar Sesión - CineCríticas',
    error: null,
    user: null,
  });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.render('login', {
        title: 'Iniciar Sesión - CineCríticas',
        error: 'Usuario y contraseña son requeridos',
        user: null
      });
    }
    
    console.log(`🔐 Intentando login: ${username}`);
    
    const user = await DatabaseService.getUserByUsername(username);
    
    if (user) {
      console.log(`✅ Usuario encontrado: ${user.username}`);
      const isValidPassword = await user.verifyPassword(password);
      
      if (isValidPassword) {
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        };
        
        console.log(`✅ Login exitoso: ${user.username} (${user.role})`);
        
        const redirectTo = req.session.returnTo || (user.role === 'admin' ? '/admin' : '/');
        delete req.session.returnTo;
        return res.redirect(redirectTo);
      } else {
        console.log('❌ Contraseña incorrecta');
      }
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
    res.render('login', {
      title: 'Iniciar Sesión - CineCríticas',
      error: 'Usuario o contraseña incorrectos',
      user: null
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.render('login', {
      title: 'Iniciar Sesión - CineCríticas',
      error: 'Error del servidor. Intenta nuevamente.',
      user: null
    });
  }
});

app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', {
    title: 'Registrarse - CineCríticas',
    error: null,
    success: null, 
    username: '',  
    email: '',     
    user: null
  });
});
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Validaciones básicas
    if (!username || !email || !password || !confirmPassword) {
      return res.render('register', {
        title: 'Registrarse - CineCríticas',
        error: 'Todos los campos son requeridos',
        success: null, // ← AGREGAR
        username: username,
        email: email,
        user: null
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('register', {
        title: 'Registrarse - CineCríticas',
        error: 'Las contraseñas no coinciden',
        success: null, // ← AGREGAR
        username: username,
        email: email,
        user: null
      });
    }
    
    if (username.length < 3 || username.length > 30) {
      return res.render('register', {
        title: 'Registrarse - CineCríticas',
        error: 'El nombre de usuario debe tener entre 3 y 30 caracteres',
        success: null, // ← AGREGAR
        username: username,
        email: email,
        user: null
      });
    }
    
    if (password.length < 6) {
      return res.render('register', {
        title: 'Registrarse - CineCríticas',
        error: 'La contraseña debe tener al menos 6 caracteres',
        success: null, // ← AGREGAR
        username: username,
        email: email,
        user: null
      });
    }
    
    const userCount = await DatabaseService.getUserCount();
    const role = userCount === 0 ? 'admin' : 'user';
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await DatabaseService.createUser({
      username,
      email,
      password_hash: hashedPassword,
      role: role
    });
    
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    };
    
    res.redirect('/?success=Cuenta creada exitosamente');
  } catch (error) {
    console.error('Error en registro:', error);
    res.render('register', {
      title: 'Registrarse - CineCríticas',
      error: 'Error al registrar usuario. El usuario o email ya existen.',
      success: null, // ← AGREGAR
      username: req.body.username,
      email: req.body.email,
      user: null
    });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ================= RUTAS DEBUG =================

// Ruta para debug de usuarios
app.get('/debug-users', async (req, res) => {
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
});

// Ruta para debug de películas
app.get('/debug-movies', async (req, res) => {
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
});

// Ruta para resetear usuarios (SOLO DESARROLLO)
app.get('/reset-db', async (req, res) => {
  if (isProduction) {
    return res.status(403).send('No disponible en producción');
  }
  
  try {
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'cinecriticas.db');
    
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    // Reiniciar la base de datos
    await initializeDatabase();
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
});

// ================= RESEÑAS USUARIOS NORMALES =================

app.get('/reviews/new', requireAuth, async (req, res) => {
  // Si es admin, redirigir al panel de admin
  if (req.session.user.role === 'admin') {
    return res.redirect('/admin/reviews/new');
  }
  
  try {
    const movies = await DatabaseService.getAllMovies();
    
    res.render('new-review-user', {
      title: 'Nueva Reseña - CineCríticas',
      user: req.session.user,
      movies: movies || [],
      success: null,
      error: null
    });
  } catch (error) {
    console.error('Error cargando películas:', error);
    res.render('new-review-user', {
      title: 'Nueva Reseña - CineCríticas',
      user: req.session.user,
      movies: [],
      success: null,
      error: 'Error al cargar la lista de películas'
    });
  }
});

app.post('/reviews/new', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/reviews/new');
    }

    const { title, content, rating, movie_title } = req.body;
    
    if (!title || !content || !rating || !movie_title) {
      const movies = await DatabaseService.getAllMovies();
      return res.render('new-review-user', {
        title: 'Nueva Reseña - CineCríticas',
        user: req.session.user,
        movies: movies,
        error: 'Todos los campos son requeridos',
        success: null
      });
    }

    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      const movies = await DatabaseService.getAllMovies();
      return res.render('new-review-user', {
        title: 'Nueva Reseña - CineCríticas',
        user: req.session.user,
        movies: movies,
        error: 'La calificación debe ser un número entre 1 y 5',
        success: null
      });
    }

    const poster_url = '/images/default-poster.jpg';
    
    await DatabaseService.createReview({
      title: title.trim(),
      content: content.trim(),
      rating: numericRating,
      movie_title: movie_title.trim(),
      poster_url,
      user_id: req.session.user.id
    });
    
    res.redirect('/?success=Reseña publicada exitosamente');
  } catch (error) {
    console.error('Error creando reseña:', error);
    const movies = await DatabaseService.getAllMovies();
    res.render('new-review-user', {
      title: 'Nueva Reseña - CineCríticas',
      user: req.session.user,
      movies: movies,
      error: 'Error creando la reseña: ' + error.message,
      success: null
    });
  }
});

// ================= RUTAS USUARIO =================

app.get('/my-reviews', requireAuth, async (req, res) => {
  try {
    const allReviews = await DatabaseService.getAllReviews();
    const userReviews = allReviews.filter(review => review.user_id === req.session.user.id);
    
    res.render('user-reviews', {
      title: 'Mis Reseñas - CineCríticas',
      user: req.session.user,
      reviews: userReviews || [],
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error cargando reseñas del usuario:', error);
    res.render('user-reviews', {
      title: 'Mis Reseñas - CineCríticas',
      user: req.session.user,
      reviews: [],
      error: 'Error al cargar tus reseñas'
    });
  }
});

// ================= ADMINISTRACIÓN =================

app.get('/admin', requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await DatabaseService.getAllUsers();
        const reviews = await DatabaseService.getAllReviews();
        const movies = await DatabaseService.getAllMovies();
        
        res.render('admin', {
            user: req.session.user,
            users: users,
            reviews: reviews,
            movies: movies,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error cargando panel admin:', error);
        res.status(500).render('admin', {
            user: req.session.user,
            users: [],
            reviews: [],
            movies: [],
            error: 'Error al cargar el panel de administración'
        });
    }
});

// ================= RUTAS ADMIN USUARIOS =================

app.get('/admin/users/new', requireAdmin, (req, res) => {
  res.render('new-user', {
    title: 'Nuevo Usuario - CineCríticas',
    user: req.session.user,
    error: null,
    success: null
  });
});

app.post('/admin/users/new', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role } = req.body;
    
    if (!username || !email || !password || !role) {
      return res.render('new-user', {
        title: 'Nuevo Usuario - CineCríticas',
        user: req.session.user,
        error: 'Todos los campos son requeridos',
        success: null
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('new-user', {
        title: 'Nuevo Usuario - CineCríticas',
        user: req.session.user,
        error: 'Las contraseñas no coinciden',
        success: null
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await DatabaseService.createUser({
      username,
      email,
      password_hash: hashedPassword,
      role
    });

    res.redirect('/admin?success=Usuario creado correctamente');
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.render('new-user', {
      title: 'Nuevo Usuario - CineCríticas',
      user: req.session.user,
      error: 'Error al crear usuario. El usuario ya existe.',
      success: null
    });
  }
});

app.get('/admin/users/:id/edit', requireAdmin, async (req, res) => {
  try {
    const userToEdit = await DatabaseService.getUserById(req.params.id);
    
    if (!userToEdit) {
      return res.redirect('/admin?error=Usuario no encontrado');
    }

    res.render('edit-user', {
      title: 'Editar Usuario - CineCríticas',
      user: req.session.user,
      userToEdit: userToEdit,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error cargando usuario para editar:', error);
    res.redirect('/admin?error=Error al cargar usuario');
  }
});

app.post('/admin/users/:id/update', requireAdmin, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    
    if (!username || !email || !role) {
      return res.redirect('/admin?error=Todos los campos son requeridos');
    }

    await DatabaseService.updateUser(req.params.id, {
      username,
      email,
      role
    });

    res.redirect('/admin?success=Usuario actualizado correctamente');
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.redirect('/admin?error=Error al actualizar usuario');
  }
});

app.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.session.user.id) {
      return res.redirect('/admin?error=No puedes eliminarte a ti mismo');
    }

    await DatabaseService.deleteUser(req.params.id);
    res.redirect('/admin?success=Usuario eliminado correctamente');
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.redirect('/admin?error=Error al eliminar usuario');
  }
});

// ================= RUTAS ADMIN RESEÑAS =================

app.get('/admin/reviews/new', requireAdmin, async (req, res) => {
  try {
    const allUsers = await DatabaseService.getAllUsers();
    const allMovies = await DatabaseService.getAllMovies();
    
    res.render('new-review-admin', {
      title: 'Nueva Reseña - Admin',
      user: req.session.user,
      users: allUsers || [],
      movies: allMovies || [],
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error cargando datos para nueva reseña:', error);
    res.render('new-review-admin', {
      title: 'Nueva Reseña - Admin',
      user: req.session.user,
      users: [],
      movies: [],
      success: null,
      error: 'Error al cargar el formulario'
    });
  }
});

app.post('/admin/reviews/new', requireAdmin, upload.single('review_image'), async (req, res) => {
  try {
    const { movie_id, movie_title, user_id, title, content, rating, is_featured } = req.body;
    
    console.log('📝 Creando nueva reseña (admin):', { 
      movie_id, movie_title, user_id, title, rating 
    });

    if (!title || !content || !rating || !movie_title || !user_id) {
      const allUsers = await DatabaseService.getAllUsers();
      const allMovies = await DatabaseService.getAllMovies();
      return res.render('new-review-admin', {
        title: 'Nueva Reseña - Admin',
        user: req.session.user,
        users: allUsers,
        movies: allMovies,
        error: 'Todos los campos son requeridos',
        success: null
      });
    }

    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      const allUsers = await DatabaseService.getAllUsers();
      const allMovies = await DatabaseService.getAllMovies();
      return res.render('new-review-admin', {
        title: 'Nueva Reseña - Admin',
        user: req.session.user,
        users: allUsers,
        movies: allMovies,
        error: 'La calificación debe ser un número entre 1 y 5',
        success: null
      });
    }

    // Procesar imagen si se subió
    let imagePath = null;
    if (req.file) {
      imagePath = '/uploads/reviews/' + req.file.filename;
      console.log('🖼️ Imagen subida:', imagePath);
    }

    // Usar poster_url de la película si no se subió imagen
    const poster_url = imagePath || req.body.poster_url || '/images/default-poster.jpg';

    await DatabaseService.createReview({
      title: title.trim(),
      content: content.trim(),
      rating: numericRating,
      movie_title: movie_title.trim(),
      poster_url,
      user_id: parseInt(user_id),
      is_featured: is_featured === 'true'
    });
    
    res.redirect('/admin?success=Reseña creada correctamente');
  } catch (error) {
    console.error('❌ Error creando reseña (admin):', error);
    
    // Eliminar imagen subida si hubo error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    const allUsers = await DatabaseService.getAllUsers();
    const allMovies = await DatabaseService.getAllMovies();
    res.render('admin-review-form', {
      title: 'Nueva Reseña - Admin',
      user: req.session.user,
      users: allUsers,
      movies: allMovies,
      error: 'Error creando la reseña: ' + error.message,
      success: null
    });
  }
});

app.get('/admin/reviews/:id/edit', requireAdmin, async (req, res) => {
  try {
    const review = await DatabaseService.getReviewById(req.params.id);
    
    if (!review) {
      return res.redirect('/admin?error=Reseña no encontrada');
    }

    res.render('edit-review', {
      title: 'Editar Reseña - CineCríticas',
      user: req.session.user,
      review: review,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error cargando reseña para editar:', error);
    res.redirect('/admin?error=Error al cargar reseña');
  }
});

app.post('/admin/reviews/:id/update', requireAdmin, upload.single('poster_image'), async (req, res) => {
  try {
    const { title, content, rating, movie_title, is_featured } = req.body;
    
    if (!title || !content || !rating || !movie_title) {
      return res.redirect(`/admin/reviews/${req.params.id}/edit?error=Todos los campos son requeridos`);
    }

    await DatabaseService.updateReview(req.params.id, {
      title,
      content,
      rating,
      movie_title,
      is_featured: is_featured === 'on'
    });

    res.redirect('/admin?success=Reseña actualizada correctamente');
  } catch (error) {
    console.error('Error actualizando reseña:', error);
    res.redirect(`/admin/reviews/${req.params.id}/edit?error=Error al actualizar reseña: ${error.message}`);
  }
});

app.get('/admin/reviews/:id/toggle-featured', requireAdmin, async (req, res) => {
  try {
    const review = await DatabaseService.getReviewById(req.params.id);
    
    if (!review) {
      return res.redirect('/admin?error=Reseña no encontrada');
    }

    await DatabaseService.updateReview(req.params.id, {
      title: review.title,
      content: review.content,
      rating: review.rating,
      movie_title: review.movie_title,
      is_featured: !review.is_featured
    });

    const message = !review.is_featured ? 'Reseña destacada' : 'Reseña removida de destacados';
    res.redirect('/admin?success=' + message);
  } catch (error) {
    console.error('Error cambiando estado de reseña:', error);
    res.redirect('/admin?error=Error al cambiar estado');
  }
});

app.post('/admin/reviews/:id/delete', requireAdmin, async (req, res) => {
  try {
    await DatabaseService.deleteReview(req.params.id);
    res.redirect('/admin?success=Reseña eliminada correctamente');
  } catch (error) {
    console.error('Error eliminando reseña:', error);
    res.redirect('/admin?error=Error al eliminar reseña');
  }
});

// ================= RUTAS ADMIN PELÍCULAS =================

// Nueva película (GET)
app.post('/admin/movies/new', requireAdmin, upload.single('poster_image'), async (req, res) => {
  try {
    const { title, year, genre, description, type } = req.body;
    
    if (!title || !year || !genre || !type) {
      return res.render('movie-form', {
        title: 'Nueva Película/Serie - CineCríticas',
        user: req.session.user,
        error: 'Todos los campos son requeridos',
        success: null
      });
    }

    // Procesar imagen si se subió
    let poster_url = '/images/default-poster.jpg';
    if (req.file) {
      poster_url = '/uploads/movies/' + req.file.filename;
      console.log('🖼️ Imagen de película subida:', poster_url);
    } else if (req.body.poster_url) {
      // Usar URL externa si se proporcionó
      poster_url = req.body.poster_url;
    }

    await DatabaseService.createMovie({
      title: title.trim(),
      year: year.trim(),
      genre: genre.trim(),
      description: description ? description.trim() : null,
      type: type,
      poster_url
    });
    
    res.redirect('/admin?success=Película/Serie creada correctamente');
  } catch (error) {
    console.error('Error creando película:', error);
    // Eliminar archivo si hubo error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.render('movie-form', {
      title: 'Nueva Película/Serie - CineCríticas',
      user: req.session.user,
      error: 'Error creando la película/serie: ' + error.message,
      success: null
    });
  }
});
// Crear nueva película (POST)
app.post('/admin/movies/new', requireAdmin, async (req, res) => {
  try {
    const { title, year, genre, description, type, poster_url } = req.body;
    
    if (!title || !year || !genre || !type) {
      return res.render('movie-form', {
        title: 'Nueva Película/Serie - CineCríticas',
        user: req.session.user,
        error: 'Todos los campos son requeridos',
        success: null
      });
    }

    await DatabaseService.createMovie({
      title: title.trim(),
      year: year.trim(),
      genre: genre.trim(),
      description: description ? description.trim() : null,
      type: type || 'movie',
      poster_url: poster_url || '/images/default-poster.jpg'
    });
    
    res.redirect('/admin?success=Película/Serie creada correctamente');
  } catch (error) {
    console.error('Error creando película:', error);
    res.render('movie-form', {
      title: 'Nueva Película/Serie - CineCríticas',
      user: req.session.user,
      error: 'Error creando la película/serie: ' + error.message,
      success: null
    });
  }
});

// Editar película (GET)
app.get('/admin/movies/:id/edit', requireAdmin, async (req, res) => {
  try {
    const movie = await DatabaseService.getMovieById(req.params.id);
    
    if (!movie) {
      return res.redirect('/admin?error=Película no encontrada');
    }

    res.render('movie-form', {
      title: 'Editar Película/Serie - CineCríticas',
      user: req.session.user,
      movie: movie,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error cargando película para editar:', error);
    res.redirect('/admin?error=Error al cargar película');
  }
});

// Actualizar película (POST)
app.post('/admin/movies/:id/edit', requireAdmin, upload.single('poster_image'), async (req, res) => {
  try {
    const { title, year, genre, description, type, poster_url, is_active } = req.body;
    
    if (!title || !year || !genre || !type) {
      return res.redirect(`/admin/movies/${req.params.id}/edit?error=Todos los campos son requeridos`);
    }

    // Procesar imagen si se subió
    let final_poster_url = poster_url || '/images/default-poster.jpg';
    if (req.file) {
      final_poster_url = '/uploads/movies/' + req.file.filename;
      console.log('🖼️ Nueva imagen de película subida:', final_poster_url);
    }

    await DatabaseService.updateMovie(req.params.id, {
      title: title.trim(),
      year: year.trim(),
      genre: genre.trim(),
      description: description ? description.trim() : null,
      type: type || 'movie',
      poster_url: final_poster_url,
      is_active: is_active === 'true'
    });
    
    res.redirect('/admin?success=Película/Serie actualizada correctamente');
  } catch (error) {
    console.error('Error actualizando película:', error);
    // Eliminar archivo si hubo error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.redirect(`/admin/movies/${req.params.id}/edit?error=${encodeURIComponent(error.message)}`);
  }
});

// Desactivar película
app.post('/admin/movies/:id/delete', requireAdmin, async (req, res) => {
  try {
    await DatabaseService.deleteMovie(req.params.id);
    res.redirect('/admin?success=Película/Serie desactivada correctamente');
  } catch (error) {
    console.error('Error desactivando película:', error);
    res.redirect('/admin?error=Error al desactivar la película');
  }
});

// Activar película
app.post('/admin/movies/:id/activate', requireAdmin, async (req, res) => {
  try {
    await DatabaseService.updateMovie(req.params.id, { is_active: true });
    res.redirect('/admin?success=Película/Serie activada correctamente');
  } catch (error) {
    console.error('Error activando película:', error);
    res.redirect('/admin?error=Error al activar la película');
  }
});

// ================= MANEJO DE ERRORES =================

app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página No Encontrada - CineCríticas',
    user: req.session.user
  });
});

app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).render('error', {
    title: 'Error - CineCríticas',
    message: 'Ha ocurrido un error inesperado.',
    user: req.session.user
  });
});

// ================= INICIO DEL SERVIDOR =================

const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor...');
    
    // Inicializar base de datos
    const dbSuccess = await initializeDatabase();
    
    if (dbSuccess) {
      console.log('✅ Base de datos inicializada');
      
      // Crear usuarios de prueba de forma segura
      const { adminCreated, userCreated } = await DatabaseService.ensureTestUsers();
      
      console.log('\n🔐 CREDENCIALES DISPONIBLES:');
      if (adminCreated) {
        console.log('   👑 ADMINISTRADOR: admin / admin123');
      }
      if (userCreated) {
        console.log('   👤 USUARIO NORMAL: usuario / password123');
      }
      
      // Mostrar información de debug
      const debugInfo = await DatabaseService.getDebugInfo();
      const movies = await DatabaseService.getAllMovies();
      console.log(`📊 Estado de la base de datos: ${debugInfo.database.usersCount} usuarios, ${movies.length} películas/series, ${debugInfo.database.reviewsCount} reseñas`);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎬 Servidor corriendo en puerto: ${PORT}`);
      console.log('✅ ¡CineCríticas está listo!');
      console.log('🌐 Accede en: http://localhost:' + PORT);
      console.log('🐛 Debug: http://localhost:' + PORT + '/debug-users');
      console.log('🎬 Debug Películas: http://localhost:' + PORT + '/debug-movies');
      console.log('🔄 Reset DB: http://localhost:' + PORT + '/reset-db (solo desarrollo)');
    });
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer();