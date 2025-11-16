// scripts/fixProductsTable.js
const DatabaseService = require('../services/DatabaseService');

async function fixProductsTable() {
  console.log('🛠️ Reparando tabla products...');
  
  try {
    await DatabaseService.initialize();
    const { sequelize } = require('../models');
    
    // Verificar estructura actual
    const tableInfo = await sequelize.query(`PRAGMA table_info(products)`);
    console.log('📊 Estructura actual de products:');
    tableInfo[0].forEach(col => console.log(`   - ${col.name} (${col.type})`));
    
    // Buscar columnas problemáticas
    const problematicColumns = tableInfo[0].filter(col => 
      ['productable_type', 'productable_id', 'stock'].includes(col.name)
    );
    
    if (problematicColumns.length > 0) {
      console.log('🔄 Eliminando columnas problemáticas...');
      
      // Crear tabla temporal
      await sequelize.query(`
        CREATE TABLE products_temp AS 
        SELECT id, name, description, price, movie_id, type, is_active, created_at, updated_at 
        FROM products
      `);
      
      // Eliminar tabla original
      await sequelize.query(`DROP TABLE products`);
      
      // Renombrar tabla temporal
      await sequelize.query(`ALTER TABLE products_temp RENAME TO products`);
      
      console.log('✅ Tabla products reparada');
    } else {
      console.log('✅ La tabla products ya tiene la estructura correcta');
    }
    
  } catch (error) {
    console.error('💥 Error reparando tabla products:', error);
  }
}

if (require.main === module) {
  fixProductsTable();
}

module.exports = fixProductsTable;