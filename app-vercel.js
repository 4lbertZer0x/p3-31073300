// app-vercel.js - VERSIÓN ESPECÍFICA PARA VERCEL
console.log('🚀 CineCríticas - Vercel Optimized Version');

const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración básica
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesión para Vercel
app.use(session({
  secret: 'cinecriticas-vercel-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Trust proxy en Vercel
app.set('trust proxy', 1);

// Datos en memoria (para demo en Vercel)
let users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@cinecriticas.com',
    password_hash: '$2a$10$8K1p/a0dRTlB0.ZQ2.Wk3eB5JY5z7QJQY5Y5Y5Y5Y5Y5Y5Y5Y5Y5', // admin123
    role: 'admin',
    created_at: new Date()
  },
  {
    id: 2,
    username: 'usuario',
    email: 'usuario@cinecriticas.com', 
    password_hash: '$2a$10$8K1p/a0dRTlB0.ZQ2.Wk3eB5JY5z7QJQY5Y5Y5Y5Y5Y5Y5Y5Y5', // password123
    role: 'user',
    created_at: new Date()
  }
];

let reviews = [
  {
    id: 1,
    title: 'Increíble película de acción',
    content: 'Efectos especiales impresionantes y trama emocionante.',
    rating: 5,
    movie_title: 'Avengers: Endgame',
    poster_url: '/images/default-poster.jpg',
    user_id: 1,
    username: 'admin',
    is_featured: 1,
    created_at: new Date()
  },
  {
    id: 2,
    title: 'Una obra maestra del drama',
    content: 'Actuaciones conmovedoras y historia que te atrapa.',
    rating: 5,
    movie_title: 'The Shawshank Redemption',
    poster_url: '/images/default-poster.jpg',
    user_id: 2,
    username: 'usuario',
    is_featured: 1,
    created_at: new Date()
  }
];

// Middleware para user global
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ================= RUTAS BÁSICAS =================

app.get('/', (req, res) => {
  res.render('index', {
    title: 'Inicio - CineCríticas',
    featuredReviews: reviews.filter(r => r.is_featured),
    allReviews: reviews,
    user: req.session.user
  });
});

app.get('/movie/:movieTitle', (req, res) => {
  const movieTitle = decodeURIComponent(req.params.movieTitle);
  const movieReviews = reviews.filter(r => r.movie_title === movieTitle);
  
  if (movieReviews.length === 0) {
    return res.status(404).render('404', {
      title: 'Película No Encontrada',
      user: req.session.user
    });
  }

  res.render('movie-reviews', {
    title: `${movieTitle} - Reseñas`,
    movieTitle: movieTitle,
    reviews: movieReviews,
    totalReviews: movieReviews.length,
    avgRating: (movieReviews.reduce((sum, r) => sum + r.rating, 0) / movieReviews.length).toFixed(1),
    featuredCount: movieReviews.filter(r => r.is_featured).length,
    user: req.session.user
  });
});

// Login
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Iniciar Sesión', error: null, user: null });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
      req.session.user = { ...user };
      return res.redirect('/');
    }
    
    res.render('login', { 
      title: 'Iniciar Sesión', 
      error: 'Usuario o contraseña incorrectos', 
      user: null 
    });
  } catch (error) {
    res.render('login', { 
      title: 'Iniciar Sesión', 
      error: 'Error del servidor', 
      user: null 
    });
  }
});

// Register
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { title: 'Registrarse', error: null, user: null });
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    if (users.find(u => u.username === username)) {
      return res.render('register', {
        title: 'Registrarse',
        error: 'El usuario ya existe',
        user: null
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      username,
      email,
      password_hash: hashedPassword,
      role: 'user',
      created_at: new Date()
    };
    
    users.push(newUser);
    req.session.user = { ...newUser };
    res.redirect('/');
  } catch (error) {
    res.render('register', {
      title: 'Registrarse',
      error: 'Error registrando usuario',
      user: null
    });
  }
});

// Crear reseña
app.get('/reviews/new', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('new-review', {
    title: 'Nueva Reseña',
    user: req.session.user,
    success: null,
    error: null
  });
});

app.post('/reviews/new', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
  const { title, content, rating, movie_title } = req.body;
  const newReview = {
    id: reviews.length + 1,
    title,
    content,
    rating: parseInt(rating),
    movie_title,
    poster_url: '/images/default-poster.jpg',
    user_id: req.session.user.id,
    username: req.session.user.username,
    is_featured: 0,
    created_at: new Date()
  };
  
  reviews.push(newReview);
  res.redirect('/?success=Reseña publicada');
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CineCríticas funcionando en Vercel',
    timestamp: new Date().toISOString(),
    users: users.length,
    reviews: reviews.length
  });
});

// 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página No Encontrada',
    user: req.session.user
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🎬 CineCríticas Vercel en puerto ${PORT}`);
});

module.exports = app;