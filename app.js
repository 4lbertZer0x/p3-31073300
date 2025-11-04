// app.js - VERSIÓN CON SWAGGER INTEGRADO
console.log('🚀 Iniciando CineCríticas con Swagger...');

// Configuración
const isProduction = process.env.NODE_ENV === 'production';

console.log('=== CINECRITICAS SWAGGER ===');
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
const jwt = require('jsonwebtoken');

// Importar servicios SQLite

const DatabaseService = require('./services/DatabaseService');

const app = express();

// PUERTO
const PORT = process.env.PORT || 3000;

// ================= CONFIGURACIÓN JWT =================
const JWT_SECRET = process.env.JWT_SECRET || 'cinecriticas-jwt-secret-2024-super-seguro';
console.log('🔐 JWT Configurado');

// ================= CONFIGURACIÓN SWAGGER =================
const { swaggerUi, specs } = require('./config/swagger');
const swaggerOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #e50914; }
    .swagger-ui .btn.authorize { background-color: #e50914; border-color: #e50914; }
    .swagger-ui .btn.authorize:hover { background-color: #b2070f; }
  `,
  customSiteTitle: 'CineCríticas API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none'
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

console.log('📚 Swagger UI disponible en: http://localhost:' + PORT + '/api-docs');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CineCríticas API Documentation'
}));

console.log('📚 Swagger UI disponible en: http://localhost:' + PORT + '/api-docs');

// ================= MIDDLEWARES JWT =================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token inválido.' });
  }
};

const requireAuthAPI = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdminAPI = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Se requieren permisos de administrador' });
  }
  next();
};

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

// Middleware para user global (compatibilidad con sesiones y JWT)
app.use((req, res, next) => {
  if (req.session.user) {
    res.locals.user = req.session.user;
  } 
  else if (req.cookies?.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
      res.locals.user = decoded;
      req.session.user = decoded;
    } catch (error) {
      res.clearCookie('token');
    }
  } else {
    res.locals.user = null;
  }
  
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

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar estado del servidor
 *     description: Endpoint de salud para verificar que la API está funcionando correctamente
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             examples:
 *               success:
 *                 summary: Estado saludable
 *                 value:
 *                   status: "OK"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   environment: "development"
 *                   version: "1.0.0"
 *                   database: "connected"
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'connected',
    auth: 'JWT + Sessions Hybrid'
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

const AuthController = require('./controllers/authController');
const UserController = require('./controllers/userController');
const ReviewController = require('./controllers/reviewController');
const AdminController = require('./controllers/adminController');
const MovieController = require('./controllers/movieController');
const PageController = require('./controllers/pageController');
const DebugController = require('./controllers/debugController');
/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verificar token JWT
 *     description: Verifica si un token JWT es válido y retorna la información del usuario
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token inválido o expirado
 */
app.get('/api/auth/verify', requireAuthAPI, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
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
    console.log('🚀 Iniciando servidor con Sequelize ORM...');
    
    // ✅ INICIALIZACIÓN MEJORADA CON MÁS VERIFICACIÓN
    console.log('1. 🔄 Inicializando DatabaseService...');
    const dbInitialized = await DatabaseService.initialize();
    
    if (!dbInitialized) {
      throw new Error('No se pudo inicializar DatabaseService');
    }
    console.log('✅ DatabaseService inicializado correctamente');
    
    // ✅ VERIFICAR Y CREAR USUARIOS CON MÁS DETALLE
    console.log('2. 👥 Verificando usuarios de prueba...');
    const { adminCreated, userCreated } = await DatabaseService.ensureTestUsers();
    
    console.log('\n🔐 ESTADO DE USUARIOS:');
    console.log('   Admin creado:', adminCreated);
    console.log('   Usuario creado:', userCreated);
    
    // ✅ VERIFICACIÓN EXTRA - BUSCAR USUARIOS REALES
    console.log('3. 🔍 Verificando usuarios en la base de datos...');
    const adminUser = await DatabaseService.getUserByUsername('admin');
    const normalUser = await DatabaseService.getUserByUsername('usuario');
    
    if (adminUser) {
      console.log('   ✅ Admin encontrado:', adminUser.username);
      console.log('   📝 Rol del admin:', adminUser.role);
      
      // Verificar contraseña inmediatamente
      try {
        const passwordValid = await adminUser.verifyPassword('admin123');
        console.log('   🔐 Contraseña admin123 válida:', passwordValid);
        
        if (!passwordValid) {
          console.log('   ⚠️  ADVERTENCIA: La contraseña no coincide');
        }
      } catch (pwError) {
        console.log('   ❌ Error verificando contraseña:', pwError.message);
      }
    } else {
      console.log('   ❌ Admin NO encontrado en BD');
    }
    
    if (normalUser) {
      console.log('   ✅ Usuario normal encontrado:', normalUser.username);
    } else {
      console.log('   ⚠️  Usuario normal NO encontrado');
    }
    
    // ✅ INFORMACIÓN DE DEBUG
    const debugInfo = await DatabaseService.getDebugInfo();
    console.log(`\n📊 ESTADO DE LA BASE DE DATOS:`);
    console.log(`   Usuarios: ${debugInfo.database.usersCount}`);
    console.log(`   Películas/Series: ${debugInfo.database.moviesCount}`);
    console.log(`   Reseñas: ${debugInfo.database.reviewsCount}`);
    
    console.log('\n🔐 SISTEMA DE AUTENTICACIÓN: JWT + Sesiones (Híbrido)');
    console.log('📚 Swagger UI: http://localhost:' + PORT + '/api-docs');
    
    // ✅ INICIAR SERVIDOR
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🎬 Servidor corriendo en puerto: ${PORT}`);
      console.log('✅ ¡CineCríticas con Sequelize ORM está listo!');
      console.log('🌐 Accede en: http://localhost:' + PORT);
      console.log('📚 Documentación API: http://localhost:' + PORT + '/api-docs');
      console.log('🔐 API Health: http://localhost:' + PORT + '/health');
      console.log('📱 API Reviews: http://localhost:' + PORT + '/api/reviews');
      
      // ✅ MENSAJE FINAL CON CREDENCIALES
      console.log('\n💡 CREDENCIALES PARA ACCEDER:');
      console.log('   👑 ADMIN: admin / admin123');
      console.log('   👤 USER:  usuario / password123');
      console.log('\n⚠️  Si no puedes acceder, ve a: http://localhost:' + PORT + '/reset-db');
    });
    
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error);
    console.error('📝 Stack trace:', error.stack);
    process.exit(1);
  }
};
if (process.env.NODE_ENV === 'test') {
  module.exports = { 
    app, 
    verifyToken, 
    requireAuthAPI, 
    requireAdminAPI,
    JWT_SECRET 
  };
} else {
  // Iniciar servidor solo si no estamos en test
  startServer();
}