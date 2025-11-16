// add-missing-fields.js
const DatabaseService = require('./services/DatabaseService');

async function addMissingFields() {
  try {
    console.log('🔄 Agregando campos faltantes a la tabla movies...');
    
    await DatabaseService.initialize();
    
    // Agregar campo genre si no existe
    try {
      await DatabaseService.db.query(`
        ALTER TABLE movies ADD COLUMN genre VARCHAR(100)
      `);
      console.log('✅ Campo "genre" agregado');
    } catch (error) {
      console.log('ℹ️  Campo "genre" ya existe o error:', error.message);
    }
    
    // Agregar campo type si no existe  
    try {
      await DatabaseService.db.query(`
        ALTER TABLE movies ADD COLUMN type VARCHAR(20) DEFAULT 'movie'
      `);
      console.log('✅ Campo "type" agregado');
    } catch (error) {
      console.log('ℹ️  Campo "type" ya existe o error:', error.message);
    }
    
    console.log('🎉 Campos agregados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addMissingFields();