const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/homeController');

// Rutas principales
router.get('/', HomeController.showHome);
router.get('/about', HomeController.showAbout);
router.get('/contact', HomeController.showContact);
app.get('/product/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Obtener producto de la base de datos
    const product = await DatabaseService.Product.findByPk(productId);
    
    if (!product) {
      return res.status(404).render('404', {
        message: 'Producto no encontrado',
        user: req.session.user
      });
    }

    // Obtener productos relacionados (misma categoría)
    const relatedProducts = await DatabaseService.Product.findAll({
      where: {
        category: product.category,
        id: { [Op.ne]: product.id } // Excluir el producto actual
      },
      limit: 4
    });

    // Renderizar la vista
    res.render('product', {
      title: `${product.name} - ElectroTienda`,
      product: product,
      relatedProducts: relatedProducts,
      user: req.session.user
    });

  } catch (error) {
    console.error('Error cargando producto:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el producto',
      user: req.session.user
    });
  }
});
module.exports = router;