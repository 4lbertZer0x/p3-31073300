const express = require('express');
const session = require('express-session');
const { initializeDatabase } = require('./models');
const DatabaseService = require('./services/DatabaseService');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'cinecriticas-secret',
    resave: false,
    saveUninitialized: true
}));

// Middleware para user global
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Middlewares de autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
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
        console.error('Error en inicio:', error);
        res.render('index', { 
            title: 'Inicio - CineCríticas', 
            featuredReviews: [] 
        });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { 
        title: 'Iniciar Sesión', 
        error: null 
    });
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await DatabaseService.getUserByUsername(username);
        
        if (user && await user.verifyPassword(password)) {
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };
            
            if (user.role === 'admin') {
                return res.redirect('/admin');
            } else {
                return res.redirect('/user/dashboard');
            }
        } else {
            return res.render('login', {
                title: 'Iniciar Sesión',
                error: 'Usuario o contraseña incorrectos'
            });
        }
    } catch (error) {
        console.error('Error en login:', error);
        return res.render('login', {
            title: 'Iniciar Sesión',
            error: 'Error del servidor'
        });
    }
});

app.get('/register', (req, res) => {
    res.render('register', {
        title: 'Registrarse',
        error: null
    });
});

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Verificar si el usuario ya existe
        const existingUser = await DatabaseService.getUserByUsername(username);
        if (existingUser) {
            return res.render('register', {
                title: 'Registrarse',
                error: 'El usuario ya existe'
            });
        }
        
        const newUser = await DatabaseService.createUser({
            username,
            email,
            password
        });
        
        req.session.user = {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
        };
        
        res.redirect('/user/dashboard');
    } catch (error) {
        console.error('Error en registro:', error);
        res.render('register', {
            title: 'Registrarse',
            error: 'Error creando usuario'
        });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Ruta simple de dashboard de usuario
app.get('/user/dashboard', requireAuth, async (req, res) => {
    try {
        const userReviews = await DatabaseService.getUserReviews(req.session.user.id);
        res.render('user/dashboard', {
            title: 'Mi Dashboard',
            reviews: userReviews
        });
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.render('user/dashboard', {
            title: 'Mi Dashboard',
            reviews: []
        });
    }
});

// Ruta para escribir reseñas
app.get('/user/reviews', requireAuth, async (req, res) => {
    try {
        const [movies, series] = await Promise.all([
            DatabaseService.getAllMovies(),
            DatabaseService.getAllSeries()
        ]);
        
        res.render('user/reviews', {
            title: 'Escribir Crítica',
            movies: movies,
            series: series
        });
    } catch (error) {
        console.error('Error cargando formulario:', error);
        res.render('user/reviews', {
            title: 'Escribir Crítica',
            movies: [],
            series: []
        });
    }
});

app.post('/user/reviews', requireAuth, async (req, res) => {
    try {
        const { title, type, rating, comment } = req.body;
        
        await DatabaseService.createReview({
            user_id: req.session.user.id,
            content_type: type,
            content_id: 1, // Por simplicidad
            title: title,
            rating: parseInt(rating),
            comment: comment
        });
        
        res.redirect('/user/dashboard');
    } catch (error) {
        console.error('Error creando reseña:', error);
        res.redirect('/user/reviews');
    }
});

// Ruta simple de admin
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const stats = await DatabaseService.getStats();
        res.render('admin/dashboard', {
            title: 'Panel de Administración',
            ...stats
        });
    } catch (error) {
        console.error('Error en admin:', error);
        res.render('admin/dashboard', {
            title: 'Panel de Administración',
            users: 0,
            movies: 0,
            series: 0,
            reviews: 0
        });
    }
});

app.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        const users = await DatabaseService.getAllUsers();
        res.render('admin/users', {
            title: 'Gestión de Usuarios',
            users: users
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.render('admin/users', {
            title: 'Gestión de Usuarios',
            users: []
        });
    }
});

app.get('/admin/reviews', requireAdmin, async (req, res) => {
    try {
        const reviews = await DatabaseService.getAllReviews();
        res.render('admin/reviews', {
            title: 'Gestión de Reseñas',
            reviews: reviews
        });
    } catch (error) {
        console.error('Error obteniendo reseñas:', error);
        res.render('admin/reviews', {
            title: 'Gestión de Reseñas',
            reviews: []
        });
    }
});

// Ruta 404
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Página No Encontrada'
    });
});

// Iniciar servidor
const startServer = async () => {
    try {
        console.log('🚀 Iniciando CineCríticas...');
        
        // Inicializar base de datos
        const success = await initializeDatabase();
        if (!success) {
            throw new Error('No se pudo inicializar la base de datos');
        }
        
        // Iniciar servidor web
        app.listen(PORT, () => {
            console.log(`🎬 Servidor corriendo en: http://localhost:${PORT}`);
            console.log('✅ ¡Aplicación lista para usar!');
            console.log('👤 Cuenta admin: usuario: admin, contraseña: admin123');
            console.log('👤 Cuenta usuario: usuario: usuario1, contraseña: user123');
        });
    } catch (error) {
        console.error('💥 Error iniciando servidor:', error);
        process.exit(1);
    }
};

startServer();