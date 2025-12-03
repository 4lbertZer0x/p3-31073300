const DatabaseService = require('../services/DatabaseService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cinecriticas-jwt-secret-2024-super-seguro';
const isProduction = process.env.NODE_ENV === 'production';

class AuthController {
  
  /**
   * @swagger
   * /login:
   *   get:
   *     summary: Mostrar formulario de login
   *     description: Renderiza la página de inicio de sesión
   *     tags:
   *       - Authentication
   *     responses:
   *       200:
   *         description: Página de login renderizada
   */
  static showLogin(req, res) {
    if (req.session.user) return res.redirect('/');
    res.render('login', {
      title: 'Iniciar Sesión - CineCríticas',
      error: req.query.error || null,
      success: req.query.success || null,
      user: null,
    });
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Iniciar sesión de usuario
   *     description: Autentica un usuario y devuelve un token JWT para usar en las APIs
   *     tags:
   *       - Authentication
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
   *                 description: Nombre de usuario
   *                 example: usuario
   *               password:
   *                 type: string
   *                 description: Contraseña del usuario
   *                 format: password
   *                 example: password123
   *     responses:
   *       200:
   *         description: Login exitoso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Error de validación
   *       401:
   *         description: Credenciales inválidas
   *       500:
   *         description: Error del servidor
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      
        if (!username || !password) {
          return AuthController.renderLoginError(res, 'Usuario y contraseña son requeridos');
      }
      
      console.log(`🔐 Intentando login: ${username}`);
      
      const user = await DatabaseService.getUserByUsername(username);
      
      if (user) {
        console.log(`✅ Usuario encontrado: ${user.username}`);
        const isValidPassword = await user.verifyPassword(password);
        
        if (isValidPassword) {
          return AuthController.handleSuccessfulLogin(req, res, user);
        } else {
          console.log('❌ Contraseña incorrecta');
        }
      } else {
        console.log('❌ Usuario no encontrado');
      }
      
  AuthController.renderLoginError(res, 'Usuario o contraseña incorrectos');
      
    } catch (error) {
      console.error('Error en login:', error);
      AuthController.handleAuthError(req, res, error, 'login');
    }
  }

  /**
   * @swagger
   * /register:
   *   get:
   *     summary: Mostrar formulario de registro
   *     description: Renderiza la página de registro de usuario
   *     tags:
   *       - Authentication
   *     responses:
   *       200:
   *         description: Página de registro renderizada
   */
  static showRegister(req, res) {
    if (req.session.user) return res.redirect('/');
    res.render('register', {
      title: 'Registrarse - CineCríticas',
      error: null,
      success: null, 
      username: '',  
      email: '',     
      user: null
    });
  }

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Registrar nuevo usuario
   *     description: Crea una nueva cuenta de usuario en el sistema
   *     tags:
   *       - Authentication
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
   *                 minLength: 3
   *                 maxLength: 30
   *                 description: Nombre de usuario único
   *                 example: nuevo_usuario
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Correo electrónico válido
   *                 example: nuevo@example.com
   *               password:
   *                 type: string
   *                 minLength: 6
   *                 format: password
   *                 description: Contraseña segura
   *                 example: password123
   *               confirmPassword:
   *                 type: string
   *                 format: password
   *                 description: Confirmación de la contraseña
   *                 example: password123
   *     responses:
   *       201:
   *         description: Usuario registrado exitosamente
   *       400:
   *         description: Error de validación o usuario existente
   *       500:
   *         description: Error del servidor
   */
  static async register(req, res) {
    try {
      const { username, email, password, confirmPassword } = req.body;
      
      // Validaciones
      const validationError = AuthController.validateRegistrationData(username, email, password, confirmPassword);
      if (validationError) {
        return AuthController.renderRegisterError(res, validationError, username, email);
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
      
      req.session.user = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      };
      
      res.redirect('/?success=Cuenta creada exitosamente');
    } catch (error) {
      console.error('Error en registro:', error);
      AuthController.renderRegisterError(
        res, 
        'Error al registrar usuario. El usuario o email ya existen.',
        req.body.username,
        req.body.email
      );
    }
  }

  /**
   * @swagger
   * /logout:
   *   post:
   *     summary: Cerrar sesión
   *     description: Cierra la sesión del usuario actual
   *     tags:
   *       - Authentication
   *     responses:
   *       200:
   *         description: Logout exitoso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Logout exitoso
   */
  static logout(req, res) {
    req.session.destroy(() => {
      res.clearCookie('token');
      
      if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, message: 'Logout exitoso' });
      }
      
      res.redirect('/');
    });
  }

  /**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Cierra la sesión del usuario actual
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Logout exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout exitoso
 */
static async logoutAPI(req, res) {
  req.session.destroy(() => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logout exitoso' });
  });
}

  // Helpers
  static renderLoginError(res, message, username = '') {
    return res.status(401).render('login', {
      title: 'Iniciar Sesión - CineCríticas',
      error: message,
      username,
      user: null
    });
  }

  static renderRegisterError(res, message, username = '', email = '') {
    return res.status(400).render('register', {
      title: 'Registrarse - CineCríticas',
      error: message,
      success: null,
      username: username || '',
      email: email || '',
      user: null
    });
  }

  static validateRegistrationData(username, email, password, confirmPassword) {
    if (!username || username.length < 3 || username.length > 30) return 'Nombre de usuario inválido (3-30 caracteres)';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) return 'Email inválido';
    if (!password || password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  }

  static async handleSuccessfulLogin(req, res, user) {
    // Create session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    // Create JWT for API usage
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    // If request expects JSON, return token
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, token });
    }

    // Redirect to intended page
    const dest = req.session.returnTo || '/';
    delete req.session.returnTo;
    return res.redirect(dest);
  }

  static handleAuthError(req, res, error, context = '') {
    console.error('Auth error', context, error && error.stack ? error.stack : error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ error: 'Error de autenticación' });
    }
    return res.status(500).render('error', {
      title: 'Error de autenticación',
      message: 'Ha ocurrido un error durante la autenticación.',
      user: req.session.user || null
    });
  }

  // ... (el resto de los métodos se mantiene igual)
}

module.exports = AuthController;