console.log("?? DIAGNÓSTICO COMPLETO");

// 1. Probar Node.js y dependencias
console.log("\n1. Probando Node.js y dependencias...");
try {
    require("express");
    require("ejs");
    require("sequelize");
    require("sqlite3");
    require("bcryptjs");
    console.log("? Todas las dependencias OK");
} catch (error) {
    console.log("? Error en dependencias:", error.message);
    process.exit(1);
}

// 2. Probar archivos locales
console.log("\n2. Probando archivos locales...");
try {
    require("./config/database");
    console.log("? config/database.js OK");
} catch (error) {
    console.log("? config/database.js:", error.message);
}

try {
    require("./models");
    console.log("? models/index.js OK");
} catch (error) {
    console.log("? models/index.js:", error.message);
}

try {
    require("./services/DatabaseService");
    console.log("? services/DatabaseService.js OK");
} catch (error) {
    console.log("? services/DatabaseService.js:", error.message);
}

// 3. Probar vistas
console.log("\n3. Probando vistas...");
const fs = require("fs");
if (fs.existsSync("./views/index.ejs")) {
    console.log("? views/index.ejs existe");
} else {
    console.log("? views/index.ejs NO existe");
}

// 4. Probar base de datos
console.log("\n4. Probando base de datos...");
async function testDatabase() {
    try {
        const { initializeDatabase } = require("./models");
        console.log("?? Inicializando BD...");
        const success = await initializeDatabase();
        if (success) {
            console.log("? Base de datos CREADA correctamente");
            console.log("?? Ubicación: ./data/cinecriticas.db");
            
            // Verificar que el archivo se creó
            if (fs.existsSync("./data/cinecriticas.db")) {
                console.log("? Archivo cinecriticas.db existe");
            } else {
                console.log("? Archivo cinecriticas.db NO se creó");
            }
        } else {
            console.log("? No se pudo crear la BD");
        }
    } catch (error) {
        console.log("? Error en BD:", error.message);
        console.log("?? Detalles:", error.stack);
    }
}

testDatabase();
