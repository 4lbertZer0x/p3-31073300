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
const path = require('path');

// Importar la inicialización de la base de datos CORRECTAMENTE
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

// Configuración de sesión SIMPLIFICADA para producción
app.use(session({
  secret: process.env.SESSION_SECRET || 'cinecriticas-production-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
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
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta principal SIMPLIFICADA
app.get('/', async (req, res) => {
  try {
    const featuredReviews = await DatabaseService.getFeaturedReviews();
    res.render('index', {
      title: 'Inicio - CineCríticas',
      featuredReviews: featuredReviews
    });
  } catch (error) {
    console.error('Error en página principal:', error);
    res.render('index', {
      title: 'Inicio - CineCríticas',
      featuredReviews: []
    });
  }
});

// Ruta de login SIMPLIFICADA
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Iniciar Sesión - CineCríticas',
    error: null
  });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await DatabaseService.getUserByUsername(username);
    
    if (user && await user.verifyPassword(password)) {
      req.session.user = user.getSafeData();
      res.redirect(user.role === 'admin' ? '/admin' : '/user/dashboard');
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
      error: 'Error del servidor'
    });
  }
});

// Ruta 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página No Encontrada - CineCríticas'
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).render('error', {
    title: 'Error - CineCríticas',
    message: 'Ha ocurrido un error inesperado.'
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    console.log('🚀 Iniciando CineCríticas...');
    console.log('📍 Entorno:', process.env.NODE_ENV || 'development');
    
    // Inicializar base de datos
    console.log('🔄 Inicializando base de datos...');
    const dbSuccess = await initializeDatabase();
    
    if (dbSuccess) {
      console.log('✅ Base de datos inicializada correctamente');
    } else {
      console.log('⚠️  Base de datos no disponible, continuando...');
    }
    
    app.listen(PORT, () => {
      console.log(`🎬 Servidor corriendo en el puerto: ${PORT}`);
      console.log('✅ ¡Aplicación lista para usar!');
    });
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer();