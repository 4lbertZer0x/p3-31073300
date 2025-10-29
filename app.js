// app.js - VERSIÓN OPTIMIZADA PARA RENDER
console.log('🚀 Iniciando CineCríticas para Render...');

// Configuración para Render
const isRender = process.env.RENDER === 'true';
const isProduction = process.env.NODE_ENV === 'production';

console.log('=== CINECRITICAS RENDER ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RENDER:', process.env.RENDER);
console.log('PORT:', process.env.PORT);
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

// PUERTO PARA RENDER
const PORT = process.env.PORT || 3000;

// ================= CONFIGURACIÓN MULTER (MEMORY STORAGE) =================
const upload = multer({
  storage: multer.memoryStorage(),
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
  res.locals.isProduction = isProduction;
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

// Ruta de salud para Render
app.get('/health', async (req, res) => {
  try {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      platform: isRender ? 'Render' : 'Local'
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
    user: null
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
    
    const user = await DatabaseService.getUserByUsername(username);
    
    if (user && await user.verifyPassword(password)) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };
      
      const redirectTo = req.session.returnTo || (user.role === 'admin' ? '/admin' : '/');
      delete req.session.returnTo;
      return res.redirect(redirectTo);
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
      role: newUser.role
    };
    
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

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ================= RESEÑAS =================

app.get('/reviews/new', requireAuth, (req, res) => {
  res.render('new-review', {
    title: 'Nueva Reseña - CineCríticas',
    user: req.session.user,
    success: null,
    error: null
  });
});

app.post('/reviews/new', requireAuth, upload.single('poster_image'), async (req, res) => {
  try {
    const { title, content, rating, movie_title } = req.body;
    
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

    // En Render, usar imagen por defecto
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
    res.render('new-review', {
      title: 'Nueva Reseña - CineCríticas',
      user: req.session.user,
      error: 'Error creando la reseña',
      success: null
    });
  }
});

// ================= ADMINISTRACIÓN =================

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
    res.redirect('/?error=Error al cargar el panel');
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
    console.log('🚀 Iniciando servidor en Render...');
    console.log('📍 Entorno:', process.env.NODE_ENV || 'development');
    console.log('🔑 Puerto:', PORT);
    
    // Inicializar base de datos
    const dbSuccess = await initializeDatabase();
    
    if (dbSuccess) {
      console.log('✅ Base de datos inicializada');
      
      // Crear usuario admin por defecto si no existe
      const users = await DatabaseService.getAllUsers();
      if (users.length === 0) {
        console.log('👤 Creando usuario administrador por defecto...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await DatabaseService.createUser({
          username: 'admin',
          email: 'admin@cinecriticas.com',
          password_hash: hashedPassword,
          role: 'admin'
        });
        console.log('✅ Usuario administrador creado');
        console.log('📧 Usuario: admin');
        console.log('🔑 Contraseña: admin123');
      }
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎬 Servidor corriendo en puerto: ${PORT}`);
      console.log('✅ ¡CineCríticas está listo!');
    });
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer();