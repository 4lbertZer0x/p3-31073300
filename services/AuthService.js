// services/AuthService.js
const bcrypt = require('bcryptjs');

class AuthService {
  // Verificar contraseña
  static async verifyPassword(password, passwordHash) {
    try {
      console.log(`\n🔐 VERIFICACIÓN DE CONTRASEÑA`);
      console.log(`📝 Contraseña ingresada: ${password}`);
      console.log(`🔒 Hash almacenado: ${passwordHash ? 'EXISTE' : 'NO EXISTE'}`);
      
      if (!passwordHash) {
        console.log('❌ ERROR: No hay hash de contraseña almacenado');
        return false;
      }
      
      // Verificar formato bcrypt
      const isBcryptHash = passwordHash.startsWith('$2a$') || 
                           passwordHash.startsWith('$2b$') ||
                           passwordHash.startsWith('$2y$');
      
      console.log(`🔍 Formato del hash: ${passwordHash.substring(0, 7)}...`);
      console.log(`✅ Es formato bcrypt válido: ${isBcryptHash}`);
      
      if (!isBcryptHash) {
        console.log('❌ ERROR: El hash NO tiene formato bcrypt válido');
        return false;
      }
      
      console.log('🔐 Comparando contraseña con bcrypt...');
      const isValid = await bcrypt.compare(password, passwordHash);
      console.log(`🎯 RESULTADO: ${isValid ? '✅ CONTRASEÑA VÁLIDA' : '❌ CONTRASEÑA INVÁLIDA'}`);
      
      return isValid;
    } catch (error) {
      console.error('💥 ERROR en verifyPassword:', error.message);
      return false;
    }
  }

  // Generar token JWT
  static generateToken(user) {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'cinecriticas-jwt-secret-2024-super-seguro';
    
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Hashear contraseña
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }
}

module.exports = AuthService;