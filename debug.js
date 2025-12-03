// debug.js - colócalo en la misma carpeta que app.js
const fs = require('fs');
const appjs = fs.readFileSync('app.js', 'utf8');
const lines = appjs.split('\n');

console.log('=== LÍNEA 1436 de app.js ===');
console.log(lines[1435]); // Array empieza en 0, así que 1436 es índice 1435
console.log('============================');

// También muestra las líneas alrededor
console.log('\n=== LÍNEAS 1430-1440 ===');
for (let i = 1429; i <= 1439; i++) {
  console.log(`${i+1}: ${lines[i] || ''}`);
}
console.log('========================\n');

// Ahora verifica si hay controladores faltantes
console.log('=== VERIFICANDO CONTROLADORES ===');
const controllers = [
  'ProductController',
  'AdminController', 
  'AuthController',
  'CartController',
  'UserController',
  'HomeController'
];

controllers.forEach(name => {
  const path = `./controllers/${name}.js`;
  try {
    if (fs.existsSync(path)) {
      const ctrl = require(path);
      console.log(`✓ ${name}: Cargado`);
    } else {
      console.log(`✗ ${name}: Archivo no existe en ${path}`);
    }
  } catch (error) {
    console.log(`✗ ${name}: Error al cargar - ${error.message}`);
  }
});