// app.js - VERSIÓN COMPLETAMENTE CORREGIDA
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
const cookieParser = require('cookie-parser');

// Importar servicios SQLite
const DatabaseService = require('./services/DatabaseService');

const app = express();

// PUERTO
const PORT = process.env.PORT || 3000;

// ================= CONFIGURACIÓN JWT =================
const JWT_SECRET = process.env.JWT_SECRET || 'cinecriticas-jwt-secret-2024-super-seguro';
console.log('🔐 JWT Configurado');

// ================= CONFIGURACIÓN SWAGGER =================
console.log('🔄 Cargando configuración Swagger...');

try {
  // Forzar recarga del módulo Swagger
  delete require.cache[require.resolve('./config/swagger')];
  const { swaggerUi, specs } = require('./config/swagger');

  console.log('📊 Especificaciones Swagger cargadas:');
  console.log('   - Paths encontrados:', specs.paths ? Object.keys(specs.paths).length : 0);

  // Configuración de Swagger UI
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list'
    }
  };

  // Servir Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

  console.log('📚 Swagger UI disponible en: http://localhost:' + PORT + '/api-docs');
} catch (error) {
  console.error('❌ Error cargando Swagger:', error.message);
  console.log('⚠️  Continuando sin Swagger UI');
}

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

// Multer para posters de películas
const movieStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads', 'movies');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'movie-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const movieUpload = multer({
  storage: movieStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

// Middleware seguro para manejar uploads de películas
const handleMovieUpload = (req, res, next) => {
  movieUpload.single('poster_image')(req, res, function(err) {
    if (err) {
      console.error('❌ Error Multer en upload de película:', err);
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        // Campo inesperado, continuar sin archivo
        req.file = null;
        return next();
      }
      return res.status(400).json({ error: 'Error al subir la imagen: ' + err.message });
    }
    next();
  });
};

// ================= CONFIGURACIÓN EXPRESS =================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

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

// ================= IMPORTAR CONTROLADORES CON MANEJO DE ERRORES =================
console.log('\n🔍 CARGANDO CONTROLADORES...');

let AuthController, UserController, ReviewController, AdminController, MovieController;
let CategoryController, TagController, ProductController, ProfileController;

// Función helper para crear controladores de respaldo
const createFallbackController = (controllerName, methods) => {
  const fallback = {};
  methods.forEach(method => {
    fallback[method] = (req, res) => {
      console.error(`❌ Controlador no disponible: ${controllerName}.${method}`);
      if (req.accepts('html')) {
        res.status(500).render('error', {
          title: 'Error',
          message: `Controlador ${controllerName} no disponible`,
          user: req.session?.user || null
        });
      } else {
        res.status(500).json({ error: `Controlador ${controllerName} no disponible` });
      }
    };
  });
  return fallback;
};

try {
  AuthController = require('./controllers/authController');
  console.log('✅ AuthController cargado');
} catch (error) {
  console.error('❌ Error cargando AuthController:', error.message);
  AuthController = createFallbackController('AuthController', [
    'showLogin', 'showRegister', 'login', 'register', 'logoutAPI'
  ]);
}

try {
  UserController = require('./controllers/userController');
  console.log('✅ UserController cargado');
} catch (error) {
  console.error('❌ Error cargando UserController:', error.message);
  UserController = createFallbackController('UserController', [
    'getProfile', 'listUsers'
  ]);
}

try {
  ReviewController = require('./controllers/reviewController');
  console.log('✅ ReviewController cargado');
} catch (error) {
  console.error('❌ Error cargando ReviewController:', error.message);
  ReviewController = createFallbackController('ReviewController', [
    'showNewUserReviewForm', 'createUserReview', 'showMyReviews', 'getAllReviews',
    'getReviewById', 'createReviewAPI', 'showNewReviewForm', 'createReviewAdmin',
    'showEditReviewForm', 'updateReviewAdmin', 'toggleFeatured', 'deleteReviewAdmin', 'showReview'
  ]);
}

try {
  AdminController = require('./controllers/adminController');
  console.log('✅ AdminController cargado');
} catch (error) {
  console.error('❌ Error cargando AdminController:', error.message);
  AdminController = createFallbackController('AdminController', [
    'showDashboard', 'showNewUserForm', 'createUser', 'showEditUserForm',
    'updateUser', 'deleteUser'
  ]);
}

try {
  MovieController = require('./controllers/movieController');
  console.log('✅ MovieController cargado');
} catch (error) {
  console.error('❌ Error cargando MovieController:', error.message);
  MovieController = createFallbackController('MovieController', [
    'showNewMovieForm', 'createMovie', 'showEditMovieForm', 'updateMovie',
    'deleteMovie', 'activateMovie'
  ]);
}

try {
  CategoryController = require('./controllers/categoryController');
  console.log('✅ CategoryController cargado');
} catch (error) {
  console.error('❌ Error cargando CategoryController:', error.message);
  CategoryController = createFallbackController('CategoryController', [
    'list', 'create', 'getById', 'update', 'remove'
  ]);
}

try {
  TagController = require('./controllers/tagController');
  console.log('✅ TagController cargado');
} catch (error) {
  console.error('❌ Error cargando TagController:', error.message);
  TagController = createFallbackController('TagController', [
    'list', 'create', 'getById', 'update', 'remove'
  ]);
}

try {
  ProductController = require('./controllers/productController');
  console.log('✅ ProductController cargado');
} catch (error) {
  console.error('❌ Error cargando ProductController:', error.message);
  ProductController = createFallbackController('ProductController', [
    'create', 'getById', 'update', 'remove', 'listPublic', 'showPublic'
  ]);
}

try {
  ProfileController = require('./controllers/profileController');
  console.log('✅ ProfileController cargado');
} catch (error) {
  console.error('❌ Error cargando ProfileController:', error.message);
  ProfileController = createFallbackController('ProfileController', [
    'showProfile', 'updateProfile', 'purchaseHistory', 'myReviews',
    'membership', 'purchaseMembership', 'getProfileStats'
  ]);
}

console.log('🎯 Todos los controladores cargados con manejo de errores');

// ================= VERIFICACIÓN DETALLADA DE CONTROLADORES =================
console.log('\n🔍 VERIFICACIÓN DETALLADA DE CONTROLADORES:');

const controllers = {
  'AuthController': AuthController,
  'UserController': UserController, 
  'ReviewController': ReviewController,
  'AdminController': AdminController,
  'MovieController': MovieController,
  'CategoryController': CategoryController,
  'TagController': TagController,
  'ProductController': ProductController,
  'ProfileController': ProfileController
};

Object.entries(controllers).forEach(([name, controller]) => {
  console.log(`\n${name}:`);
  if (!controller) {
    console.log('  ❌ CONTROLADOR UNDEFINED');
    return;
  }
  
  // Listar métodos disponibles
  const methods = Object.getOwnPropertyNames(controller).filter(prop => 
    typeof controller[prop] === 'function' && prop !== 'constructor'
  );
  
  if (methods.length > 0) {
    console.log(`  ✅ Métodos: ${methods.join(', ')}`);
  } else {
    console.log('  ⚠️  No se encontraron métodos');
  }
});

// ================= ENDPOINTS DOCUMENTADOS PARA SWAGGER =================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar estado del servidor
 *     description: Endpoint de salud para verificar que la API está funcionando correctamente
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'connected'
  });
});

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Endpoint de prueba
 *     description: Solo para probar que Swagger funciona
 *     tags: [Test]
 *     responses:
 *       200:
 *         description: Test exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Swagger funciona correctamente"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Swagger funciona correctamente',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health',
      '/api/test', 
      '/api/reviews',
      '/api/auth/login',
      '/api/auth/register',
      '/api/user/profile'
    ]
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

// ================= RUTAS DE PERFIL DE USUARIO =================
app.get('/user/profile', requireAuth, ProfileController.showProfile);
app.put('/api/user/profile', requireAuthAPI, ProfileController.updateProfile);
app.get('/user/purchase-history', requireAuth, ProfileController.purchaseHistory);
app.get('/user/my-reviews', requireAuth, ProfileController.myReviews);
app.get('/user/membership', requireAuth, ProfileController.membership);
app.post('/api/user/membership/purchase', requireAuthAPI, ProfileController.purchaseMembership);
app.get('/api/user/profile/stats', requireAuthAPI, ProfileController.getProfileStats);

// ================= RUTA PARA VER RESEÑA INDIVIDUAL - CORREGIDA =================
app.get('/review/:id', ReviewController.showReview);

// ================= RUTAS DE RESEÑAS PARA USUARIOS NORMALES =================
app.get('/reviews/new', requireAuth, ReviewController.showNewUserReviewForm);
app.post('/reviews/new', requireAuth, ReviewController.createUserReview);
app.get('/user/my-reviews', requireAuth, ReviewController.showMyReviews);

// ================= RUTAS DE AUTENTICACIÓN WEB =================
app.get('/login', AuthController.showLogin);
app.get('/register', AuthController.showRegister);
app.post('/auth/login', AuthController.login);
app.post('/auth/register', AuthController.register);

// ================= RUTAS DE API DOCUMENTADAS =================

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     description: Autentica un usuario y devuelve un token JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: usuario
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
app.post('/api/auth/login', AuthController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     description: Crea una nueva cuenta de usuario
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               username:
 *                 type: string
 *                 example: nuevo_usuario
 *               email:
 *                 type: string
 *                 example: nuevo@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               confirmPassword:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Error de validación
 */
app.post('/api/auth/register', AuthController.register);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Cierra la sesión del usuario actual
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout exitoso
 */
app.post('/api/auth/logout', AuthController.logoutAPI);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verificar token JWT
 *     description: Verifica si un token JWT es válido
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 */
app.get('/api/auth/verify', requireAuthAPI, (req, res) => {
  res.json({ valid: true, user: req.user });
});

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Obtener perfil del usuario
 *     description: Retorna la información del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 */
app.get('/api/user/profile', requireAuthAPI, UserController.getProfile);

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Obtener todas las reseñas
 *     description: Retorna la lista completa de reseñas
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: Lista de reseñas obtenida exitosamente
 */
app.get('/api/reviews', ReviewController.getAllReviews);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Obtener reseña por ID
 *     description: Retorna una reseña específica por su ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reseña encontrada
 *       404:
 *         description: Reseña no encontrada
 */
app.get('/api/reviews/:id', ReviewController.getReviewById);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Crear nueva reseña
 *     description: Crea una nueva reseña (requiere autenticación)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - rating
 *               - movie_title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Gran película
 *               content:
 *                 type: string
 *                 example: Me encantó la trama
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               movie_title:
 *                 type: string
 *                 example: Avatar
 *     responses:
 *       201:
 *         description: Reseña creada exitosamente
 */
app.post('/api/reviews', requireAuthAPI, ReviewController.createReviewAPI);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Obtener todos los usuarios (Admin)
 *     description: Retorna la lista completa de usuarios
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida
 *       403:
 *         description: No tiene permisos de administrador
 */
app.get('/api/admin/users', requireAuthAPI, requireAdminAPI, UserController.listUsers);

// Rutas CRUD protegidas para Categories
app.get('/api/categories', requireAuthAPI, CategoryController.list);
app.post('/api/categories', requireAuthAPI, CategoryController.create);
app.get('/api/categories/:id', requireAuthAPI, CategoryController.getById);
app.put('/api/categories/:id', requireAuthAPI, CategoryController.update);
app.delete('/api/categories/:id', requireAuthAPI, CategoryController.remove);

// Rutas CRUD protegidas para Tags
app.get('/api/tags', requireAuthAPI, TagController.list);
app.post('/api/tags', requireAuthAPI, TagController.create);
app.get('/api/tags/:id', requireAuthAPI, TagController.getById);
app.put('/api/tags/:id', requireAuthAPI, TagController.update);
app.delete('/api/tags/:id', requireAuthAPI, TagController.remove);

// Rutas de gestión de Products (protegidas)
app.post('/api/products', requireAuthAPI, ProductController.create);
app.get('/api/products/:id', requireAuthAPI, ProductController.getById);
app.put('/api/products/:id', requireAuthAPI, ProductController.update);
app.delete('/api/products/:id', requireAuthAPI, ProductController.remove);

// Rutas públicas de productos
app.get('/products', ProductController.listPublic);
app.get('/p/:idslug', ProductController.showPublic);

// ================= RUTAS DE ADMIN WEB =================
app.get('/admin', requireAuth, AdminController.showDashboard);

// Función helper segura para rutas
const safeRoute = (controller, methodName, fallbackMessage = 'Controlador no disponible') => {
  if (controller && controller[methodName]) {
    return controller[methodName];
  } else {
    console.error(`❌ Controlador no disponible: ${methodName}`);
    return (req, res) => {
      if (req.accepts('html')) {
        res.status(500).render('error', {
          title: 'Error',
          message: fallbackMessage,
          user: req.session.user
        });
      } else {
        res.status(500).json({ error: fallbackMessage });
      }
    };
  }
};

// Admin - películas (RUTAS SEGURAS - CORREGIDAS CON HANDLEMOVIEUPLOAD)
app.get('/admin/movies/new', requireAdmin, safeRoute(MovieController, 'showNewMovieForm'));
app.post('/admin/movies/new', requireAdmin, handleMovieUpload, safeRoute(MovieController, 'createMovie'));
app.get('/admin/movies/:id/edit', requireAdmin, safeRoute(MovieController, 'showEditMovieForm'));
app.post('/admin/movies/:id/edit', requireAdmin, handleMovieUpload, safeRoute(MovieController, 'updateMovie'));
app.post('/admin/movies/:id/delete', requireAdmin, safeRoute(MovieController, 'deleteMovie'));
app.post('/admin/movies/:id/activate', requireAdmin, safeRoute(MovieController, 'activateMovie'));
app.post('/admin/movies/:id/update', requireAdmin, handleMovieUpload, safeRoute(MovieController, 'updateMovie'));

// Admin - usuarios (RUTAS SEGURAS)
app.get('/admin/users/new', requireAdmin, safeRoute(AdminController, 'showNewUserForm'));
app.post('/admin/users/new', requireAdmin, safeRoute(AdminController, 'createUser'));
app.get('/admin/users/:id/edit', requireAdmin, safeRoute(AdminController, 'showEditUserForm'));
app.post('/admin/users/:id/edit', requireAdmin, safeRoute(AdminController, 'updateUser'));
app.post('/admin/users/:id/delete', requireAdmin, safeRoute(AdminController, 'deleteUser'));
app.post('/admin/users/:id/update', requireAdmin, safeRoute(AdminController, 'updateUser'));

// Admin - reseñas (RUTAS SEGURAS)
app.get('/admin/reviews/new', requireAdmin, safeRoute(ReviewController, 'showNewReviewForm'));
app.post('/admin/reviews/new', requireAdmin, upload.single('review_image'), safeRoute(ReviewController, 'createReviewAdmin'));
app.get('/admin/reviews/:id/edit', requireAdmin, safeRoute(ReviewController, 'showEditReviewForm'));
app.post('/admin/reviews/:id/edit', requireAdmin, upload.single('review_image'), safeRoute(ReviewController, 'updateReviewAdmin'));
app.get('/admin/reviews/:id/toggle-featured', requireAdmin, safeRoute(ReviewController, 'toggleFeatured'));
app.post('/admin/reviews/:id/delete', requireAdmin, safeRoute(ReviewController, 'deleteReviewAdmin'));
app.post('/admin/reviews/:id/update', requireAdmin, upload.single('review_image'), safeRoute(ReviewController, 'updateReviewAdmin'));

// ================= RUTA DE LOGOUT =================
app.post('/logout', (req, res) => {
  try {
    const username = req.session?.user?.username || 'Usuario desconocido';
    console.log(`🔐 Cerrando sesión para: ${username}`);

    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Error destruyendo sesión:', err);
        return res.status(500).redirect('/?error=Error al cerrar sesión');
      }

      res.clearCookie('connect.sid');
      res.clearCookie('token');
      return res.redirect('/?success=Sesión cerrada correctamente');
    });
  } catch (error) {
    console.error('💥 Error inesperado en logout:', error);
    return res.redirect('/?error=Error inesperado al cerrar sesión');
  }
});

app.get('/logout', (req, res) => {
  try {
    const username = req.session?.user?.username || 'Usuario desconocido';
    console.log(`🔐 Cerrando sesión (GET) para: ${username}`);

    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Error destruyendo sesión (GET):', err);
        return res.status(500).redirect('/?error=Error al cerrar sesión');
      }

      res.clearCookie('connect.sid');
      res.clearCookie('token');
      return res.redirect('/?success=Sesión cerrada correctamente');
    });
  } catch (error) {
    console.error('💥 Error inesperado en logout (GET):', error);
    return res.redirect('/?error=Error inesperado al cerrar sesión');
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
    console.log('🚀 Iniciando servidor con Sequelize ORM...');
    
    console.log('1. 🔄 Inicializando DatabaseService...');
    const dbInitialized = await DatabaseService.initialize();
    
    if (!dbInitialized) {
      throw new Error('No se pudo inicializar DatabaseService');
    }
    console.log('✅ DatabaseService inicializado correctamente');
    
    console.log('2. 👥 Verificando usuarios de prueba...');
    const { adminCreated, userCreated } = await DatabaseService.ensureTestUsers();
    
    console.log('\n🔐 ESTADO DE USUARIOS:');
    console.log('   Admin creado:', adminCreated);
    console.log('   Usuario creado:', userCreated);
    
    console.log('🎬 Iniciando servidor en puerto:', PORT);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🎬 Servidor corriendo en puerto: ${PORT}`);
      console.log('✅ ¡CineCríticas está listo!');
      console.log('🌐 Accede en: http://localhost:' + PORT);
      console.log('📚 Documentación API: http://localhost:' + PORT + '/api-docs');
      console.log('🔐 API Health: http://localhost:' + PORT + '/health');
      console.log('🧪 API Test: http://localhost:' + PORT + '/api/test');
      
      console.log('\n💡 CREDENCIALES PARA ACCEDER:');
      console.log('   👑 ADMIN: admin / admin123');
      console.log('   👤 USER:  usuario / password123');
    });
    
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error.message);
    
    // Mostrar opciones de reparación
    console.log('\n🔧 SOLUCIONES POSIBLES:');
    console.log('1. Ejecuta: npm run repair-db');
    console.log('2. O visita: http://localhost:' + PORT + '/api/system/repair-database');
    console.log('3. Verifica que los archivos de modelos estén en la carpeta models/');
    
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
  startServer();
}