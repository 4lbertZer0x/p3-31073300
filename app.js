// Sin dotenv en producción - Render maneja las variables
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
    console.log('🔧 Development mode with dotenv');
  } catch (error) {
    console.log('⚠️  dotenv not available');
  }
}

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');

// Importar servicios
const { initializeDatabase } = require('./models');
const DatabaseService = require('./services/DatabaseService');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración básica
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesión PARA PRODUCCIÓN
app.use(session({
  store: new pgSession({
    pool: DatabaseService.pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'cinecriticas-production-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware para user global
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Middlewares de autenticación
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  next();
};

// Ruta de salud para Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'PostgreSQL'
  });
});

// Ruta principal
app.get('/', async (req, res) => {
  try {
    const featuredReviews = await DatabaseService.getFeaturedReviews();
    res.render('index', {
      title: 'Inicio - CineCríticas',
      featuredReviews: featuredReviews,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error en página principal:', error);
    res.render('index', {
      title: 'Inicio - CineCríticas',
      featuredReviews: [],
      user: req.session.user
    });
  }
});

// Ruta de login
app.get('/login', (req, res) => {
  // Si ya está logueado, redirigir al dashboard
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/user/dashboard');
  }
  
  res.render('login', {
    title: 'Iniciar Sesión - CineCríticas',
    error: null
  });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.render('login', {
        title: 'Iniciar Sesión - CineCríticas',
        error: 'Usuario y contraseña son requeridos'
      });
    }
    
    const user = await DatabaseService.getUserByUsername(username);
    
    if (user && await user.verifyPassword(password)) {
      req.session.user = user.getSafeData();
      
      // Redirigir según el rol
      const redirectTo = req.session.returnTo || (user.role === 'admin' ? '/admin' : '/');
      delete req.session.returnTo;
      
      return res.redirect(redirectTo);
    } else {
      res.render('login', {
        title: 'Iniciar Sesión - CineCríticas',
        error: 'Usuario o contraseña incorrectos'
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.render('login', {
      title: 'Iniciar Sesión - CineCríticas',
      error: 'Error del servidor. Intenta nuevamente.'
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

// Ruta de dashboard básico
app.get('/user/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', {
    title: 'Mi Dashboard - CineCríticas',
    user: req.session.user
  });
});

// Ruta de admin básica
app.get('/admin', requireAdmin, (req, res) => {
  res.render('admin', {
    title: 'Panel de Administración - CineCríticas',
    user: req.session.user
  });
});

// Ruta 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página No Encontrada - CineCríticas',
    user: req.session.user
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).render('error', {
    title: 'Error - CineCríticas',
    message: 'Ha ocurrido un error inesperado.',
    user: req.session.user
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    console.log('🚀 Iniciando CineCríticas...');
    console.log('📍 Entorno:', process.env.NODE_ENV || 'development');
    console.log('🔄 Puerto:', PORT);
    
    // Verificar variables de entorno críticas
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL no encontrada en producción');
      process.exit(1);
    }
    
    // Inicializar base de datos
    console.log('🔄 Inicializando base de datos...');
    const dbSuccess = await initializeDatabase();
    
    if (dbSuccess) {
      console.log('✅ Base de datos inicializada correctamente');
      
      // Crear usuario admin por defecto si no existe
      await createDefaultAdmin();
    } else {
      console.log('❌ No se pudo inicializar la base de datos');
      if (process.env.NODE_ENV === 'production') {
        console.error('💥 No se puede continuar en producción sin base de datos');
        process.exit(1);
      }
    }
    
    app.listen(PORT, () => {
      console.log(`🎬 Servidor corriendo en: http://localhost:${PORT}`);
      console.log('✅ ¡Aplicación lista para usar!');
    });
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error);
    process.exit(1);
  }
};

// Función para crear usuario admin por defecto
async function createDefaultAdmin() {
  try {
    const adminExists = await DatabaseService.getUserByUsername('admin');
    
    if (!adminExists) {
      // En una app real, usarías bcrypt para hashear la contraseña
      await DatabaseService.query(
        `INSERT INTO users (username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4)`,
        ['admin', 'admin@cinecriticas.com', 'admin123', 'admin']
      );
      console.log('✅ Usuario admin creado (username: admin, password: admin123)');
    }
  } catch (error) {
    console.log('⚠️  No se pudo crear usuario admin:', error.message);
  }
}

// Iniciar la aplicación
startServer();