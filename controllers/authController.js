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
      error: null,
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
        return this.renderLoginError(res, 'Usuario y contraseña son requeridos');
      }
      
      console.log(`🔐 Intentando login: ${username}`);
      
      const user = await DatabaseService.getUserByUsername(username);
      
      if (user) {
        console.log(`✅ Usuario encontrado: ${user.username}`);
        const isValidPassword = await user.verifyPassword(password);
        
        if (isValidPassword) {
          return this.handleSuccessfulLogin(req, res, user);
        } else {
          console.log('❌ Contraseña incorrecta');
        }
      } else {
        console.log('❌ Usuario no encontrado');
      }
      
      this.renderLoginError(res, 'Usuario o contraseña incorrectos');
      
    } catch (error) {
      console.error('Error en login:', error);
      this.handleAuthError(req, res, error, 'login');
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
      const validationError = this.validateRegistrationData(username, email, password, confirmPassword);
      if (validationError) {
        return this.renderRegisterError(res, validationError, username, email);
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
      this.renderRegisterError(
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

  // ... (el resto de los métodos se mantiene igual)
}

module.exports = AuthController;