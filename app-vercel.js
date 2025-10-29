// app-vercel.js - VERSIÓN MÍNIMA PARA DIAGNOSTICAR
console.log('🚀 CineCríticas - Versión mínima para Vercel');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración básica
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta de salud básica
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CineCríticas está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Ruta principal simple
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>CineCríticas</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎬 CineCríticas</h1>
            <p>La plataforma está en mantenimiento. Volveremos pronto.</p>
            <p><a href="/health">Ver estado del servicio</a></p>
        </div>
    </body>
    </html>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;