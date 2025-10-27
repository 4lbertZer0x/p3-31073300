// scripts/check-db.js - VERSIÓN SIN DOTENV
const DatabaseService = require('../services/DatabaseService');

async function checkDatabase() {
  console.log('🔍 Verificando configuración de PostgreSQL...');
  console.log('📍 Entorno:', process.env.NODE_ENV || 'development');
  console.log('🔑 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Presente' : '❌ No encontrada');
  
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  Variables alternativas:');
    console.log('   DB_HOST:', process.env.DB_HOST || 'No configurado');
    console.log('   DB_USER:', process.env.DB_USER || 'No configurado');
    console.log('   DB_NAME:', process.env.DB_NAME || 'No configurado');
    console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Configurada' : '❌ No configurada');
  }
  
  console.log('\n🔄 Probando conexión a la base de datos...');
  
  try {
    const result = await DatabaseService.testConnection();
    
    if (result.success) {
      console.log('✅ PostgreSQL conectado correctamente');
      console.log('⏰ Hora del servidor:', result.time);
      process.exit(0);
    } else {
      console.log('❌ Error conectando a PostgreSQL:', result.error);
      console.log('\n🔧 Posibles soluciones:');
      console.log('1. Ejecuta: npm install');
      console.log('2. Verifica que PostgreSQL esté instalado y corriendo');
      console.log('3. Crea un archivo .env con las variables de conexión');
      process.exit(1);
    }
  } catch (error) {
    console.log('💥 Error grave:', error.message);
    console.log('📦 Ejecuta: npm install');
    process.exit(1);
  }
}

checkDatabase();