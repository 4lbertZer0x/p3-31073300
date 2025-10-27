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

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración básica
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesión para producción
app.use(session({
  secret: process.env.SESSION_SECRET || 'cinecriticas-production-secret-key',
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
  
  // Rutas Públicas
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
  
  // ... (mantén el resto de tus rutas igual que antes)
  
  // Ruta de salud para Render
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
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
  
  // Ruta 404
  app.use((req, res) => {
    res.status(404).render('404', {
      title: 'Página No Encontrada - CineCríticas'
    });
  });
  
  // Iniciar servidor
  const startServer = async () => {
    try {
      console.log('🚀 Iniciando CineCríticas...');
      console.log('📍 Entorno:', process.env.NODE_ENV || 'development');
      console.log('🗄️  Base de datos:', process.env.DATABASE_URL ? 'PostgreSQL (Render)' : 'No configurada');
      
      // Inicializar base de datos
      const dbSuccess = await initializeDatabase();
      
      app.listen(PORT, () => {
        console.log(`🎬 Servidor corriendo en: http://localhost:${PORT}`);
        console.log('✅ ¡Aplicación lista para usar!');
        
        if (dbSuccess) {
          console.log('👤 Cuentas de prueba:');
          console.log('   Admin: usuario: admin, contraseña: admin123');
          console.log('   Usuario: usuario: usuario1, contraseña: user123');
        } else {
          console.log('⚠️  La aplicación funciona pero la base de datos no está disponible');
        }
      });
    } catch (error) {
      console.error('💥 Error crítico iniciando servidor:', error);
      process.exit(1);
    }
  };
  
  startServer();