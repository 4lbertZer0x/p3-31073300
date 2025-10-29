// app.js - VERSIÓN CONFIGURADA PARA RENDER
console.log('🚀 Iniciando CineCríticas para Render...');

// Configuración para Render
const isRender = process.env.RENDER === 'true';
const isProduction = process.env.NODE_ENV === 'production';

console.log('=== CINECRITICAS RENDER DEBUG ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RENDER:', process.env.RENDER);
console.log('PORT:', process.env.PORT);
console.log('Current directory:', process.cwd());
console.log('=== END DEBUG ===');

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

// PUERTO PARA RENDER
const PORT = process.env.PORT || 3000;

// ================= CONFIGURACIÓN MULTER (MEMORY STORAGE) =================
// En Render usar memoryStorage ya que no tenemos escritura persistente
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// ================= CONFIGURACIÓN EXPRESS =================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesión para producción
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'cinecriticas-render-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
};

// En Render, confiar en el proxy
if (isProduction) {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));
console.log('🔐 Sesiones configuradas para Render');

// Middleware para user global
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.isProduction = isProduction;
  next();
});

// Debug middleware solo en desarrollo
if (!isProduction) {
  app.use((req, res, next) => {
    console.log('📨 Ruta solicitada:', req.method, req.url);
    console.log('👤 Usuario en sesión:', req.session.user ? req.session.user.username : 'No logueado');
    next();
  });
}

// ================= MIDDLEWARES DE AUTENTICACIÓN =================

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  
  if (req.session.user.role !== 'admin') {
    console.log('❌ Acceso denegado. Rol:', req.session.user.role);
    return res.status(403).render('error', {
      title: 'Acceso Denegado',
      message: 'No tienes permisos de administrador para acceder a esta página.',
      user: req.session.user
    });
  }
  next();
};

// ================= RUTAS PÚBLICAS =================

// Ruta de salud para Render
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await DatabaseService.testConnection();
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      platform: isRender ? 'Render' : 'Local',
      database: {
        type: 'SQLite',
        connected: dbStatus.success,
        path: dbStatus.path
      },
      render: {
        instance: process.env.RENDER_INSTANCE_ID || 'N/A',
        service: process.env.RENDER_SERVICE_ID || 'N/A'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      error: error.message 
    });
  }
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
    const reviewId = req.params.id;
    const review = await DatabaseService.getReviewById(reviewId);
    
    if (!review) {
      return res.status(404).render('404', {
        title: 'Reseña No Encontrada - CineCríticas',
        user: req.session.user
      });
    }

    const otherReviews = await DatabaseService.getReviewsByMovie(review.movie_title);
    const filteredReviews = otherReviews.filter(r => r.id != reviewId);
    
    const totalReviews = otherReviews.length;
    const avgRating = otherReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const featuredCount = otherReviews.filter(r => r.is_featured).length;

    res.render('review-template', {
      title: `${review.movie_title} - CineCríticas`,
      review: review,
      otherReviews: filteredReviews,
      totalReviews: totalReviews,
      avgRating: avgRating.toFixed(1),
      featuredCount: featuredCount,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error cargando reseña:', error);
    res.status(500).render('error', {
      title: 'Error - CineCríticas',
      message: 'Error al cargar la reseña.',
      user: req.session.user
    });
  }
});

// Ruta para ver todas las reseñas de una película
app.get('/movie/:movieTitle', async (req, res) => {
  try {
    const movieTitle = decodeURIComponent(req.params.movieTitle);
    const reviews = await DatabaseService.getReviewsByMovie(movieTitle);
    
    if (reviews.length === 0) {
      return res.status(404).render('404', {
        title: 'Película No Encontrada - CineCríticas',
        user: req.session.user
      });
    }

    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const featuredCount = reviews.filter(r => r.is_featured).length;

    res.render('movie-reviews', {
      title: `${movieTitle} - Reseñas - CineCríticas`,
      movieTitle: movieTitle,
      reviews: reviews,
      totalReviews: totalReviews,
      avgRating: avgRating.toFixed(1),
      featuredCount: featuredCount,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error cargando reseñas de película:', error);
    res.status(500).render('error', {
      title: 'Error - CineCríticas',
      message: 'Error al cargar las reseñas.',
      user: req.session.user
    });
  }
});

// ================= AUTENTICACIÓN =================

// Ruta de login (GET)
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  
  res.render('login', {
    title: 'Iniciar Sesión - CineCríticas',
    error: null,
    user: null
  });
});

// Ruta de login (POST)
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
    
    const user = await DatabaseService.getUserByUsername(username);
    
    if (!isProduction) {
      console.log('🔍 Usuario encontrado:', user);
    }
    
    if (user) {
      const passwordMatch = await user.verifyPassword(password);
      
      if (!isProduction) {
        console.log('🔍 ¿Coincide la contraseña?:', passwordMatch);
      }
      
      if (passwordMatch) {
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        };
        
        if (!isProduction) {
          console.log('✅ Usuario logeado:', req.session.user);
        }
        
        const redirectTo = req.session.returnTo || (user.role === 'admin' ? '/admin' : '/');
        delete req.session.returnTo;
        
        return res.redirect(redirectTo);
      }
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

// Ruta de registro
app.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  
  res.render('register', {
    title: 'Registrarse - CineCríticas',
    error: null,
    user: null
  });
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    if (!username || !email || !password) {
      return res.render('register', {
        title: 'Registrarse - CineCríticas',
        error: 'Todos los campos son requeridos',
        user: null
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('register', {
        title: 'Registrarse - CineCríticas',
        error: 'Las contraseñas no coinciden',
        user: null
      });
    }
    
    const userCount = await DatabaseService.getUserCount();
    const role = userCount === 0 ? 'admin' : 'user';
    
    if (!isProduction) {
      console.log(`👥 Total usuarios: ${userCount}, Nuevo rol: ${role}`);
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await DatabaseService.createUser({
      username,
      email,
      password_hash: hashedPassword,
      role: role
    });
    
    if (!newUser) {
      return res.render('register', {
        title: 'Registrarse - CineCríticas',
        error: 'Error al crear el usuario',
        user: null
      });
    }
    
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      created_at: newUser.created_at
    };
    
    if (!isProduction) {
      console.log('✅ Nuevo usuario registrado:', req.session.user);
    }
    
    res.redirect('/');
  } catch (error) {
    console.error('Error en registro:', error);
    res.render('register', {
      title: 'Registrarse - CineCríticas',
      error: 'Error al registrar usuario. El usuario ya existe.',
      user: null
    });
  }
});

// Ruta de logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error cerrando sesión:', err);
    }
    res.redirect('/');
  });
});

// Ruta de perfil
app.get('/profile', requireAuth, (req, res) => {
  res.render('profile', {
    title: 'Mi Perfil - CineCríticas',
    user: req.session.user
  });
});

// ================= RESEÑAS (USUARIOS NORMALES) =================

// Ruta para crear reseñas (GET)
app.get('/reviews/new', requireAuth, (req, res) => {
  res.render('new-review', {
    title: 'Nueva Reseña - CineCríticas',
    user: req.session.user,
    success: null,
    error: null
  });
});

// Ruta para crear reseñas (POST) - CON IMAGEN POR DEFECTO EN RENDER
app.post('/reviews/new', requireAuth, upload.single('poster_image'), async (req, res) => {
  try {
    const { title, content, rating, movie_title } = req.body;
    
    if (!isProduction) {
      console.log('📝 Datos recibidos para nueva reseña:', {
        title,
        content: content ? `${content.substring(0, 50)}...` : 'empty',
        rating,
        movie_title,
        file: req.file ? 'file received' : 'no file'
      });
    }
    
    if (!title || !content || !rating || !movie_title) {
      return res.render('new-review', {
        title: 'Nueva Reseña - CineCríticas',
        user: req.session.user,
        error: 'Todos los campos son requeridos',
        success: null
      });
    }

    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.render('new-review', {
        title: 'Nueva Reseña - CineCríticas',
        user: req.session.user,
        error: 'La calificación debe ser un número entre 1 y 5',
        success: null
      });
    }

    // En Render, siempre usar imagen por defecto
    const poster_url = '/images/default-poster.jpg';
    
    await DatabaseService.createReview({
      title: title.trim(),
      content: content.trim(),
      rating: numericRating,
      movie_title: movie_title.trim(),
      poster_url,
      user_id: req.session.user.id
    });
    
    if (!isProduction) {
      console.log('✅ Nueva reseña creada por usuario:', req.session.user.username);
    }
    
    res.redirect('/?success=Reseña publicada exitosamente');
  } catch (error) {
    console.error('Error creando reseña:', error);
    res.render('new-review', {
      title: 'Nueva Reseña - CineCríticas',
      user: req.session.user,
      error: 'Error creando la reseña: ' + error.message,
      success: null
    });
  }
});

// ================= ADMINISTRACIÓN =================

// Panel de administración principal
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const allReviews = await DatabaseService.getAllReviews();
    const allUsers = await DatabaseService.getAllUsers();
    
    res.render('admin', {
      title: 'Panel de Administración',
      user: req.session.user,
      reviews: allReviews || [],
      users: allUsers || [],
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error en admin:', error);
    res.redirect('/?error=Error al cargar el panel de administración');
  }
});

// ================= GESTIÓN DE USUARIOS (ADMIN) =================

app.get('/admin/users/:id/edit', requireAdmin, async (req, res) => {
  try {
    if (!isProduction) {
      console.log('📝 Editando usuario ID:', req.params.id);
    }
    
    const userToEdit = await DatabaseService.getUserById(req.params.id);
    
    if (!userToEdit) {
      return res.redirect('/admin?error=Usuario no encontrado');
    }

    return res.render('edit-user', {
      title: 'Editar Usuario - CineCríticas',
      user: req.session.user,
      userToEdit: userToEdit,
      success: null,
      error: null
    });
    
  } catch (error) {
    console.error('❌ Error en la ruta:', error);
    return res.redirect('/admin?error=Error al cargar el usuario: ' + error.message);
  }
});

// Procesar edición de usuario
app.post('/admin/users/:id/update', requireAdmin, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    
    if (!isProduction) {
      console.log('Actualizando usuario:', { id: req.params.id, username, email, role });
    }
    
    await DatabaseService.updateUser(req.params.id, {
      username,
      email,
      role
    });

    res.redirect('/admin?success=Usuario actualizado exitosamente');
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.redirect('/admin?error=Error al actualizar el usuario');
  }
});

// Eliminar usuario
app.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.session.user;
    
    if (parseInt(userId) === currentUser.id) {
      return res.redirect('/admin?error=No puedes eliminarte a ti mismo');
    }

    await DatabaseService.deleteUser(userId);
    res.redirect('/admin?success=Usuario eliminado exitosamente');
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.redirect('/admin?error=Error al eliminar el usuario');
  }
});

// Mostrar formulario para nuevo usuario
app.get('/admin/users/new', requireAdmin, (req, res) => {
  res.render('new-user', {
    title: 'Nuevo Usuario - CineCríticas',
    user: req.session.user,
    success: null,
    error: null
  });
});

// Procesar nuevo usuario
app.post('/admin/users/new', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role } = req.body;
    
    if (!isProduction) {
      console.log('📝 Creando nuevo usuario:', { username, email, role });
    }
    
    if (!username || !email || !password || !confirmPassword) {
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
    
    if (password.length < 6) {
      return res.render('new-user', {
        title: 'Nuevo Usuario - CineCríticas',
        user: req.session.user,
        error: 'La contraseña debe tener al menos 6 caracteres',
        success: null
      });
    }
    
    const existingUser = await DatabaseService.getUserByUsername(username);
    if (existingUser) {
      return res.render('new-user', {
        title: 'Nuevo Usuario - CineCríticas',
        user: req.session.user,
        error: 'El nombre de usuario ya existe',
        success: null
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await DatabaseService.createUser({
      username,
      email,
      password_hash: hashedPassword,
      role: role || 'user'
    });
    
    if (!isProduction) {
      console.log('✅ Nuevo usuario creado:', newUser);
    }
    
    res.redirect('/admin?success=Usuario creado exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    res.render('new-user', {
      title: 'Nuevo Usuario - CineCríticas',
      user: req.session.user,
      error: 'Error al crear el usuario: ' + error.message,
      success: null
    });
  }
});

// ================= GESTIÓN DE RESEÑAS (ADMIN) =================

app.get('/admin/reviews/:id/edit', requireAdmin, async (req, res) => {
  try {
    const review = await DatabaseService.getReviewById(req.params.id);
    if (!review) {
      return res.redirect('/admin?error=Reseña no encontrada');
    }

    if (!isProduction) {
      console.log('🎬 Editando reseña:', review);
    }

    res.render('edit-review', {
      title: 'Editar Reseña - CineCríticas',
      review: review,
      user: req.session.user,
      success: null,
      error: null
    });
  } catch (error) {
    console.error('Error cargando reseña:', error);
    res.redirect('/admin?error=Error al cargar la reseña');
  }
});

// Procesar edición de reseña - CON IMAGEN POR DEFECTO EN RENDER
app.post('/admin/reviews/:id/update', requireAdmin, upload.single('poster_image'), async (req, res) => {
  try {
    const { title, content, rating, movie_title, is_featured } = req.body;
    
    if (!isProduction) {
      console.log('📝 Datos recibidos para actualizar reseña:', {
        title,
        content: content ? `${content.substring(0, 50)}...` : 'empty',
        rating,
        movie_title,
        is_featured,
        file: req.file ? 'file received' : 'no file'
      });
    }
    
    if (!title || !content || !rating || !movie_title) {
      return res.redirect('/admin?error=Todos los campos son requeridos');
    }
    
    const currentReview = await DatabaseService.getReviewById(req.params.id);
    
    // En Render, mantener la imagen actual (siempre será la por defecto)
    const poster_url = currentReview.poster_url;
    
    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.redirect('/admin?error=La calificación debe ser un número entre 1 y 5');
    }
    
    await DatabaseService.updateReview(req.params.id, {
      title: title.trim(),
      content: content.trim(),
      rating: numericRating,
      movie_title: movie_title.trim(),
      poster_url,
      is_featured: is_featured === 'on'
    });

    res.redirect('/admin?success=Reseña actualizada exitosamente');
  } catch (error) {
    console.error('Error actualizando reseña:', error);
    res.redirect('/admin?error=Error al actualizar la reseña: ' + error.message);
  }
});

// Eliminar reseña
app.post('/admin/reviews/:id/delete', requireAdmin, async (req, res) => {
  try {
    await DatabaseService.deleteReview(req.params.id);
    res.redirect('/admin?success=Reseña eliminada exitosamente');
  } catch (error) {
    console.error('Error eliminando reseña:', error);
    res.redirect('/admin?error=Error al eliminar la reseña');
  }
});

// ================= RUTAS ESPECIALES PARA DEBUG =================

// Ruta para hacer admin (SOLO PARA DESARROLLO)
if (!isProduction) {
  app.get('/make-admin', async (req, res) => {
    try {
      const users = await DatabaseService.getAllUsers();
      if (users.length > 0) {
        const firstUser = users[0];
        await DatabaseService.updateUser(firstUser.id, { role: 'admin' });
        
        res.send(`
          <h1>✅ ¡Usuario convertido a Admin!</h1>
          <p>El usuario <strong>${firstUser.username}</strong> ahora tiene rol de administrador.</p>
          <p><a href="/login">Iniciar sesión nuevamente</a> para aplicar los cambios.</p>
        `);
      } else {
        res.send('<h1>❌ No hay usuarios en la base de datos</h1>');
      }
    } catch (error) {
      console.error('Error haciendo admin:', error);
      res.send(`<h1>❌ Error: ${error.message}</h1>`);
    }
  });
}

// Ruta para ver información de sesión
app.get('/debug-session', (req, res) => {
  res.json({
    session: req.session,
    user: req.session.user,
    environment: process.env.NODE_ENV,
    isProduction: isProduction,
    isRender: isRender
  });
});

// ================= MANEJO DE ERRORES =================

// Middleware para manejar errores de multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).render('error', {
        title: 'Error - Archivo muy grande',
        message: 'El archivo es demasiado grande. Máximo 5MB permitido.',
        user: req.session.user
      });
    }
  } else if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).render('error', {
      title: 'Error - Tipo de archivo no válido',
      message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF, etc.).',
      user: req.session.user
    });
  }
  next(error);
});

// Ruta 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página No Encontrada - CineCríticas',
    user: req.session.user
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).render('error', {
    title: 'Error - CineCríticas',
    message: 'Ha ocurrido un error inesperado.',
    user: req.session.user,
    error: !isProduction ? error : null
  });
});

// ================= INICIO DEL SERVIDOR =================

const startServer = async () => {
  try {
    console.log('🚀 Iniciando CineCríticas para Render...');
    console.log('📍 Entorno:', process.env.NODE_ENV || 'development');
    console.log('🔑 Puerto:', PORT);
    console.log('🗄️  Base de datos: SQLite');
    console.log('🌍 Plataforma:', isRender ? 'Render' : 'Local');
    
    const dbSuccess = await initializeDatabase();
    
    if (dbSuccess) {
      console.log('✅ SQLite inicializado correctamente');
      
      const users = await DatabaseService.getAllUsers();
      console.log(`👥 Usuarios en base de datos: ${users.length}`);
      
      // Crear usuario admin por defecto si no hay usuarios
      if (users.length === 0) {
        console.log('👤 Creando usuario administrador por defecto...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await DatabaseService.createUser({
          username: 'admin',
          email: 'admin@cinecriticas.com',
          password_hash: hashedPassword,
          role: 'admin'
        });
        console.log('✅ Usuario administrador creado: admin / admin123');
      }
    } else {
      console.log('⚠️  Problemas con SQLite, pero continuando...');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎬 Servidor corriendo en: http://0.0.0.0:${PORT}`);
      console.log('✅ ¡CineCríticas está listo para Render!');
      
      if (isProduction) {
        console.log('💡 MODO RENDER: Usando imágenes por defecto');
      }
    });
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer();