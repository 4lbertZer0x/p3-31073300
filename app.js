// app.js - VERSIÓN COMPLETA CON SUBIDA DE IMÁGENES Y SISTEMA DE RESEÑAS
console.log('🚀 Iniciando CineCríticas con SQLite y subida de imágenes...');

// Verificar dotenv solo en desarrollo
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
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

// Importar servicios SQLite
const { initializeDatabase } = require('./models');
const DatabaseService = require('./services/DatabaseServiceSQLite');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= CONFIGURACIÓN MULTER (SUBIDA DE ARCHIVOS) =================

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public/uploads');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'poster-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes
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
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

// ================= CONFIGURACIÓN EXPRESS =================

// Configuración básica
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesión
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'cinecriticas-sqlite-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
};

app.use(session(sessionConfig));
console.log('🔐 Sesiones configuradas');

// Middleware para user global
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Debug middleware
app.use((req, res, next) => {
    console.log('📨 Ruta solicitada:', req.method, req.url);
    console.log('👤 Usuario en sesión:', req.session.user ? req.session.user.username : 'No logueado');
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

// Ruta de salud
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await DatabaseService.testConnection();
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        type: 'SQLite',
        connected: dbStatus.success,
        path: dbStatus.path
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
    
    console.log('🔍 Usuario encontrado:', user);
    console.log('🔍 Contraseña proporcionada:', password);
    
    if (user) {
      // Verificar contraseña
      const passwordMatch = await user.verifyPassword(password);
      console.log('🔍 ¿Coincide la contraseña?:', passwordMatch);
      
      if (passwordMatch) {
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        };
        
        console.log('✅ Usuario logeado:', req.session.user);
        
        const redirectTo = req.session.returnTo || (user.role === 'admin' ? '/admin' : '/');
        delete req.session.returnTo;
        
        return res.redirect(redirectTo);
      }
    }
    
    // Si llegamos aquí, las credenciales son incorrectas
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
    
    // Verificar si es el primer usuario (hacerlo admin)
    const userCount = await DatabaseService.getUserCount();
    const role = userCount === 0 ? 'admin' : 'user';
    
    console.log(`👥 Total usuarios: ${userCount}, Nuevo rol: ${role}`);
    
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
    
    // Auto-login después del registro
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      created_at: newUser.created_at
    };
    
    console.log('✅ Nuevo usuario registrado:', req.session.user);
    
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

// Ruta para crear reseñas (POST) - MEJORADA
app.post('/reviews/new', requireAuth, upload.single('poster_image'), async (req, res) => {
  try {
    const { title, content, rating, movie_title } = req.body;
    
    console.log('📝 Datos recibidos para nueva reseña:', {
      title,
      content: content ? `${content.substring(0, 50)}...` : 'empty',
      rating,
      movie_title,
      file: req.file ? req.file.filename : 'no file'
    });
    
    // Validaciones
    if (!title || !content || !rating || !movie_title) {
      return res.render('new-review', {
        title: 'Nueva Reseña - CineCríticas',
        user: req.session.user,
        error: 'Todos los campos son requeridos',
        success: null
      });
    }

    // Validar rating
    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.render('new-review', {
        title: 'Nueva Reseña - CineCríticas',
        user: req.session.user,
        error: 'La calificación debe ser un número entre 1 y 5',
        success: null
      });
    }

    // Manejar la imagen subida
    let poster_url = '/images/default-poster.jpg';
    if (req.file) {
      poster_url = '/uploads/' + req.file.filename;
    }
    
    // Crear la reseña
    await DatabaseService.createReview({
      title: title.trim(),
      content: content.trim(),
      rating: numericRating,
      movie_title: movie_title.trim(),
      poster_url,
      user_id: req.session.user.id
    });
    
    console.log('✅ Nueva reseña creada por usuario:', req.session.user.username);
    
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
    console.log('📝 Editando usuario ID:', req.params.id);
    
    // Obtener el usuario a editar
    const userToEdit = await DatabaseService.getUserById(req.params.id);
    
    console.log('🔍 Resultado de getUserById:', userToEdit);
    
    if (!userToEdit) {
      console.log('❌ Usuario no encontrado');
      return res.redirect('/admin?error=Usuario no encontrado');
    }

    console.log('✅ Usuario encontrado, renderizando...');
    
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
    
    console.log('Actualizando usuario:', { id: req.params.id, username, email, role });
    
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
    
    console.log('📝 Creando nuevo usuario:', { username, email, role });
    
    // Validaciones
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
    
    // Verificar si el usuario ya existe
    const existingUser = await DatabaseService.getUserByUsername(username);
    if (existingUser) {
      return res.render('new-user', {
        title: 'Nuevo Usuario - CineCríticas',
        user: req.session.user,
        error: 'El nombre de usuario ya existe',
        success: null
      });
    }
    
    // Crear el usuario
    const newUser = await DatabaseService.createUser({
      username,
      email,
      password_hash: password, // Se hashea automáticamente en createUser
      role: role || 'user'
    });
    
    console.log('✅ Nuevo usuario creado:', newUser);
    
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

// Mostrar formulario para editar reseña

app.get('/admin/reviews/:id/edit', requireAdmin, async (req, res) => {
  try {
    const review = await DatabaseService.getReviewById(req.params.id);
    if (!review) {
      return res.redirect('/admin?error=Reseña no encontrada');
    }

    console.log('🎬 Editando reseña:', review);

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

// Procesar edición de reseña - CON SUBIDA DE IMÁGENES
app.post('/admin/reviews/:id/update', requireAdmin, upload.single('poster_image'), async (req, res) => {
  try {
    const { title, content, rating, movie_title, is_featured } = req.body;
    
    console.log('📝 Datos recibidos para actualizar reseña:', {
      title,
      content: content ? `${content.substring(0, 50)}...` : 'empty',
      rating,
      movie_title,
      is_featured,
      file: req.file ? req.file.filename : 'no file'
    });
    
    // Validar campos requeridos
    if (!title || !content || !rating || !movie_title) {
      console.log('❌ Campos faltantes:', { title, content, rating, movie_title });
      return res.redirect('/admin?error=Todos los campos son requeridos');
    }
    
    // Obtener la reseña actual para conservar la imagen si no se sube una nueva
    const currentReview = await DatabaseService.getReviewById(req.params.id);
    let poster_url = currentReview.poster_url;
    
    // Si se subió una nueva imagen, actualizar la URL
    if (req.file) {
      poster_url = '/uploads/' + req.file.filename;
      
      // Opcional: eliminar la imagen anterior si no es la default
      if (currentReview.poster_url && !currentReview.poster_url.includes('default-poster')) {
        const oldImagePath = path.join(__dirname, 'public', currentReview.poster_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    // Asegurarse de que el rating sea un número
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
    // Obtener la reseña antes de eliminarla para borrar la imagen si es necesario
    const review = await DatabaseService.getReviewById(req.params.id);
    
    // Eliminar la imagen asociada si existe y no es la default
    if (review && review.poster_url && !review.poster_url.includes('default-poster')) {
      const imagePath = path.join(__dirname, 'public', review.poster_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await DatabaseService.deleteReview(req.params.id);
    res.redirect('/admin?success=Reseña eliminada exitosamente');
  } catch (error) {
    console.error('Error eliminando reseña:', error);
    res.redirect('/admin?error=Error al eliminar la reseña');
  }
});

// ================= RUTAS ESPECIALES PARA DEBUG =================

// Ruta para hacer admin (SOLO PARA DESARROLLO)
app.get('/make-admin', async (req, res) => {
  try {
    // Hacer el primer usuario admin
    const users = await DatabaseService.getAllUsers();
    if (users.length > 0) {
      const firstUser = users[0];
      await DatabaseService.updateUser(firstUser.id, { role: 'admin' });
      
      console.log(`✅ Usuario ${firstUser.username} ahora es admin`);
      
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

// Ruta para restablecer contraseñas - ELIMINAR después de usar
app.get('/reset-passwords', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    
    // Restablecer contraseña del admin
    const adminHash = await bcrypt.hash('admin123', 10);
    await DatabaseService.db.run(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [adminHash, 'admin']
    );
    
    // Restablecer contraseña del usuario normal
    const userHash = await bcrypt.hash('password123', 10);
    await DatabaseService.db.run(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [userHash, 'usuario']
    );
    
    res.send(`
      <h1>✅ Contraseñas restablecidas</h1>
      <p>Contraseñas actualizadas a:</p>
      <ul>
        <li><strong>admin</strong> / admin123</li>
        <li><strong>usuario</strong> / password123</li>
      </ul>
      <a href="/login">Ir al login</a>
    `);
  } catch (error) {
    res.send(`<h1>❌ Error: ${error.message}</h1>`);
  }
});

// Ruta para ver información de sesión
app.get('/debug-session', (req, res) => {
  res.json({
    session: req.session,
    user: req.session.user,
    cookies: req.cookies
  });
});

// Ruta para reparar base de datos
app.get('/fix-database', async (req, res) => {
  try {
    await DatabaseService.db.exec('ALTER TABLE reviews ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    await DatabaseService.db.exec('ALTER TABLE reviews ADD COLUMN poster_url VARCHAR(500) DEFAULT "/images/default-poster.jpg"');
    res.send('✅ Base de datos reparada');
  } catch (error) {
    res.send(`❌ Error: ${error.message}`);
  }
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
    error: process.env.NODE_ENV === 'development' ? error : null
  });
});

// ================= INICIO DEL SERVIDOR =================

const startServer = async () => {
  try {
    console.log('🚀 Iniciando CineCríticas...');
    console.log('📍 Entorno:', process.env.NODE_ENV || 'development');
    console.log('🔑 Puerto:', PORT);
    console.log('🗄️  Base de datos: SQLite');
    console.log('🖼️  Subida de imágenes: Habilitada');
    
    // Inicializar base de datos SQLite
    console.log('🔄 Inicializando SQLite...');
    const dbSuccess = await initializeDatabase();
    
    if (dbSuccess) {
      console.log('✅ SQLite inicializado correctamente');
      
      // Verificar si hay usuarios y mostrar info
      const users = await DatabaseService.getAllUsers();
      console.log(`👥 Usuarios en base de datos: ${users.length}`);
      
      users.forEach(user => {
        console.log(`   📧 ${user.username} (${user.email}) - Rol: ${user.role}`);
      });
    } else {
      console.log('⚠️  Problemas con SQLite, pero continuando...');
    }
    
    // Crear directorio de uploads si no existe
    const uploadDir = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('📁 Directorio de uploads creado:', uploadDir);
    }
    
    // Crear directorio de imágenes por defecto si no existe
    const imagesDir = path.join(__dirname, 'public/images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('📁 Directorio de imágenes creado:', imagesDir);
    }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🎬 Servidor corriendo en: http://localhost:${PORT}`);
      console.log('✅ ¡CineCríticas está listo!');
      
      console.log('\n🔗 Rutas importantes:');
      console.log('   📍 /              - Página principal');
      console.log('   📍 /register      - Registrarse (primer usuario será admin)');
      console.log('   📍 /login         - Iniciar sesión');
      console.log('   📍 /reviews/new   - Crear nueva reseña (usuarios y admins)');
      console.log('   📍 /admin         - Panel de administración');
      console.log('   📍 /make-admin    - Hacer primer usuario admin (debug)');
      console.log('   📍 /reset-passwords - Restablecer contraseñas (debug)');
      console.log('   📍 /debug-session - Ver información de sesión');
      console.log('   📍 /fix-database  - Reparar base de datos');
      console.log('   📍 /health        - Estado del servidor');
      
      console.log('\n💡 IMPORTANTE:');
      console.log('   - El PRIMER usuario que se registre será ADMIN');
      console.log('   - Usa /register primero para crear un usuario admin');
      console.log('   - O usa /make-admin para convertir el primer usuario en admin');
      console.log('   - Si no puedes iniciar sesión, usa /reset-passwords');
      console.log('   - Ahora puedes subir imágenes para los pósters de las reseñas');
      console.log('   - Usuarios y administradores pueden crear reseñas');
    });
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer();