// check-dependencies.js
console.log('🔍 Verificando dependencias...');

const dependencies = [
  'express',
  'ejs', 
  'express-session',
  'sqlite3',
  'sqlite',
  'express-session-sqlite',
  'dotenv'
];

dependencies.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep}: OK`);
  } catch (error) {
    console.log(`❌ ${dep}: FALTA - Ejecuta: npm install ${dep}`);
  }
});

console.log('\n🎯 Si hay errores, ejecuta: npm install');