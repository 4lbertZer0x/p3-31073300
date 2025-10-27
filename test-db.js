// test-db.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// DEFINIR dbPath PRIMERO, ANTES DE USARLO
const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔍 DIAGNÓSTICO COMPLETO\n');

// 1. Probando Node.js y dependencias...
console.log('1. Probando Node.js y dependencias...');
try {
    require('express');
    require('sequelize');
    require('ejs');
    console.log('✅ Todas las dependencias OK');
} catch (error) {
    console.log('❌ Error en dependencias:', error.message);
}

// 2. Probando archivos locales...
console.log('2. Probando archivos locales...');
const filesToCheck = [
    'config/database.js',
    'models/index.js', 
    'services/DatabaseService.js'
];

filesToCheck.forEach(file => {
    try {
        require.resolve(`./${file}`);
        console.log(`✅ ${file} OK`);
    } catch (error) {
        console.log(`❌ ${file} no encontrado`);
    }
});

// 3. Probando vistas...
console.log('3. Probando vistas...');
try {
    const viewPath = path.join(__dirname, 'views', 'index.ejs');
    require('fs').accessSync(viewPath);
    console.log('✅ views/index.ejs existe');
} catch (error) {
    console.log('❌ views/index.ejs no encontrado');
}

// 4. Probando base de datos...
console.log('4. Probando base de datos...');
console.log('Base de datos ubicada en:', dbPath); // AHORA dbPath ESTÁ DEFINIDO

// Verificar si el archivo de base de datos existe
const fs = require('fs');
if (fs.existsSync(dbPath)) {
    console.log('✅ Archivo de base de datos existe');
    
    // Conectar a la base de datos
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.log('❌ Error conectando a la base de datos:', err.message);
            return;
        }
        
        console.log('✅ Conexión a SQLite establecida');
        
        // Consultar tablas
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.log('❌ Error consultando tablas:', err.message);
            } else {
                console.log('📊 Tablas encontradas:');
                if (tables.length === 0) {
                    console.log('   - No hay tablas en la base de datos');
                } else {
                    tables.forEach(table => console.log(`   - ${table.name}`));
                }
            }
            
            // Cerrar conexión
            db.close((err) => {
                if (err) {
                    console.log('❌ Error cerrando conexión:', err.message);
                } else {
                    console.log('✅ Conexión cerrada correctamente');
                }
            });
        });
    });
} else {
    console.log('❌ Archivo de base de datos NO existe en:', dbPath);
    console.log('💡 Ejecuta primero: npm start');
}

console.log('\n🎯 DIAGNÓSTICO FINALIZADO');