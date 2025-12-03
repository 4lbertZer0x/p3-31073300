const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { isAuthenticated, isAdmin } = require('../middlewares/auth');

// Rutas públicas
router.get('/product/:idslug', ProductController.showPublic); // Ver producto individual
router.get('/p/:idslug', ProductController.showPublic); // Alias corto
router.get('/shop', ProductController.listPublic); // Listar productos con filtros
router.get('/category/:category', ProductController.listPublic); // Productos por categoría

// Rutas protegidas (admin)
router.post('/admin/products', isAuthenticated, isAdmin, ProductController.create);
router.get('/admin/products/:id', isAuthenticated, isAdmin, ProductController.getById);
router.put('/admin/products/:id', isAuthenticated, isAdmin, ProductController.update);
router.delete('/admin/products/:id', isAuthenticated, isAdmin, ProductController.remove);

module.exports = router;