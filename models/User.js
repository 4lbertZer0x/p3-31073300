// models/User.js - VERSIÓN CORREGIDA DEFINITIVA
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
hooks: {
  beforeCreate: async (user) => {
    console.log('🔐 HOOK beforeCreate ejecutándose para:', user.username);
    console.log('📝 Contraseña original:', user.password_hash ? 'EXISTE' : 'NO EXISTE');
    
    // ✅ SOLUCIÓN: Solo hashear si NO es un hash bcrypt válido
    if (user.password_hash && !user.password_hash.startsWith('$2a$') && !user.password_hash.startsWith('$2b$')) {
      console.log('🔄 Hasheando contraseña en texto plano...');
      user.password_hash = await bcrypt.hash(user.password_hash, 10);
      console.log('✅ Contraseña hasheada correctamente');
      console.log('🔒 Hash resultante:', user.password_hash.substring(0, 25) + '...');
    } else if (user.password_hash) {
      console.log('ℹ️  La contraseña YA está hasheada, no se modifica');
      console.log('🔒 Hash existente:', user.password_hash.substring(0, 25) + '...');
    } else {
      console.log('❌ ERROR: No hay contraseña para hashear');
    }
  },
  beforeUpdate: async (user) => {
    if (user.changed('password_hash') && 
        !user.password_hash.startsWith('$2a$') && 
        !user.password_hash.startsWith('$2b$')) {
      console.log('🔐 HOOK beforeUpdate: Hasheando nueva contraseña para:', user.username);
      user.password_hash = await bcrypt.hash(user.password_hash, 10);
    }
  }
}
});

// MÉTODO DE VERIFICACIÓN SIMPLIFICADO Y ROBUSTO
// MÉTODO DE VERIFICACIÓN CORREGIDO - ACEPTA $2a$ Y $2b$
User.prototype.verifyPassword = async function(password) {
  try {
    console.log(`\n🔐 VERIFICACIÓN DE CONTRASEÑA PARA: ${this.username}`);
    console.log(`📝 Contraseña ingresada: ${password}`);
    console.log(`🔒 Hash almacenado: ${this.password_hash ? 'EXISTE' : 'NO EXISTE'}`);
    
    if (!this.password_hash) {
      console.log('❌ ERROR: No hay hash de contraseña almacenado');
      return false;
    }
    
    // ✅ CORREGIDO: ACEPTAR $2a$ Y $2b$ (ambos son bcrypt válidos)
    const isBcryptHash = this.password_hash.startsWith('$2a$') || 
                         this.password_hash.startsWith('$2b$') ||
                         this.password_hash.startsWith('$2y$');
    
    console.log(`🔍 Formato del hash: ${this.password_hash.substring(0, 7)}...`);
    console.log(`✅ Es formato bcrypt válido: ${isBcryptHash}`);
    
    if (!isBcryptHash) {
      console.log('❌ ERROR: El hash NO tiene formato bcrypt válido');
      console.log('💡 Hash actual:', this.password_hash);
      return false;
    }
    
    console.log('🔐 Comparando contraseña con bcrypt...');
    const isValid = await bcrypt.compare(password, this.password_hash);
    console.log(`🎯 RESULTADO: ${isValid ? '✅ CONTRASEÑA VÁLIDA' : '❌ CONTRASEÑA INVÁLIDA'}`);
    
    return isValid;
  } catch (error) {
    console.error('💥 ERROR en verifyPassword:', error.message);
    console.error('📝 Stack:', error.stack);
    return false;
  }
};

// No exponer password_hash
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

module.exports = User;