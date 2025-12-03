// repair-db.js
const DatabaseService = require('./services/DatabaseService');
const { sequelize } = require('./config/database');

async function repairDatabase() {
  try {
    console.log('🔧 INICIANDO REPARACIÓN DE BASE DE DATOS...');
    
    // Forzar sincronización
    console.log('1. Sincronizando modelos...');
    await sequelize.sync({ force: true });
    console.log('✅ Modelos sincronizados');
    
    // Inicializar DatabaseService
    console.log('2. Inicializando DatabaseService...');
    const dbInitialized = await DatabaseService.initialize();
    
    if (dbInitialized) {
      console.log('✅ DatabaseService inicializado correctamente');
      
      // Crear usuarios de prueba
      console.log('3. Creando usuarios de prueba...');
      const { adminCreated, userCreated } = await DatabaseService.ensureTestUsers();
      console.log(`✅ Admin creado: ${adminCreated}, Usuario creado: ${userCreated}`);
      
      console.log('\n🎉 REPARACIÓN COMPLETADA EXITOSAMENTE');
      console.log('🔐 Credenciales:');
      console.log('   👑 ADMIN: admin / admin123');
      console.log('   👤 USER:  usuario / password123');
    } else {
      throw new Error('No se pudo inicializar DatabaseService');
    }
    
  } catch (error) {
    console.error('❌ Error en reparación:', error.message);
    console.error(error.stack);
  } finally {
    process.exit();
  }
}

repairDatabase();