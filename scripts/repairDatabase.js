// scripts/repairDatabase.js
const DatabaseService = require('../services/DatabaseService');

async function repairDatabase() {
  console.log('🛠️ Iniciando reparación de base de datos...');
  
  try {
    const success = await DatabaseService.initialize();
    
    if (success) {
      console.log('✅ Base de datos reparada correctamente');
      
      await DatabaseService.ensureTestUsers();
      
      const debugInfo = await DatabaseService.getDebugInfo();
      console.log('📊 Estado de la base de datos:', debugInfo);
    } else {
      console.log('❌ No se pudo reparar la base de datos');
    }
  } catch (error) {
    console.error('💥 Error crítico en reparación:', error);
  }
}

if (require.main === module) {
  repairDatabase();
}

module.exports = repairDatabase;