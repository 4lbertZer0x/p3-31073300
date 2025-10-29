// vercel-diagnostic.js - SOLO DIAGNÓSTICO
console.log('=== VERCEL DIAGNOSTIC START ===');

const express = require('express');
const app = express();

// Ruta de diagnóstico
app.get('/', (req, res) => {
  console.log('✅ Ruta / accedida');
  res.json({
    status: 'OK',
    message: 'CineCríticas Diagnostic',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    checks: {
      express: 'working',
      routing: 'working'
    }
  });
});

// Export para Vercel
module.exports = app;

console.log('=== VERCEL DIAGNOSTIC END ===');