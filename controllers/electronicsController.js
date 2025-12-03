const DatabaseService = require('../services/DatabaseService');
const fs = require('fs');
const path = require('path');

class ElectronicsController {
  // Métodos adaptados de MovieController, pero con wording de producto electrónico
  static async showNewProductForm(req, res) {
    let categories = [];
    if (DatabaseService.Category) {
      categories = await DatabaseService.Category.findAll({ order: [['name', 'ASC']] });
    }
    res.render('product-form', {
      title: 'Nuevo Producto Electrónico - ElectroTienda',
      user: req.session.user,
      product: null,
      categories,
      error: null,
      success: null
    });
  }

  static async createProduct(req, res) {
    try {
      const { name, price, description, categories } = req.body;
      // Validar nombre y precio
      if (!name?.trim() || !price?.trim()) {
        return res.render('product-form', {
          title: 'Nuevo Producto Electrónico - ElectroTienda',
          user: req.session.user,
          product: null,
          error: 'El nombre y el precio son obligatorios.',
          success: null
        });
      }
      // Procesar categorías seleccionadas (IDs y nuevas)
      let categoryInstances = [];
      let selected = [];
      if (categories) {
        selected = Array.isArray(categories) ? categories : [categories];
      }
      // Filtrar vacíos y procesar
      for (const catVal of selected) {
        if (typeof catVal === 'string' && catVal.startsWith('new:')) {
          const newCatName = catVal.slice(4).trim();
          if (newCatName) {
            let cat = await DatabaseService.Category.findOne({ where: { name: newCatName } });
            if (!cat) cat = await DatabaseService.Category.create({ name: newCatName });
            categoryInstances.push(cat);
          }
        } else if (catVal && !isNaN(Number(catVal))) {
          let cat = await DatabaseService.Category.findByPk(catVal);
          if (cat) categoryInstances.push(cat);
        }
      }
      // Validar que haya al menos una categoría
      if (categoryInstances.length === 0) {
        return res.render('product-form', {
          title: 'Nuevo Producto Electrónico - ElectroTienda',
          user: req.session.user,
          product: null,
          error: 'Debes seleccionar o crear al menos una categoría.',
          success: null
        });
      }
      let images = [];
      if (req.files && req.files.length > 0) {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        for (const file of req.files) {
          if (!allowedMimes.includes(file.mimetype)) {
            fs.unlinkSync(file.path);
            return res.render('product-form', {
              title: 'Nuevo Producto Electrónico - ElectroTienda',
              user: req.session.user,
              product: null,
              error: 'Formato de imagen no válido. Use JPEG, PNG, GIF o WebP',
              success: null
            });
          }
          images.push('/uploads/products/' + file.filename);
        }
      }
      const productData = {
        name: name.trim(),
        description: description ? description.trim() : null,
        images: images.length > 0 ? JSON.stringify(images) : null,
        is_active: true,
        price: price ? parseFloat(price) : null
      };
      // Crear producto y asociar categorías (muchos a muchos)
      const product = await DatabaseService.Product.create(productData);
      if (categoryInstances.length > 0 && product.setCategories) {
        await product.setCategories(categoryInstances.map(c => c.id));
      }
      res.redirect('/admin?success=Producto creado correctamente');
    } catch (error) {
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch {}
          }
        }
      }
      res.render('product-form', {
        title: 'Nuevo Producto Electrónico - ElectroTienda',
        user: req.session.user,
        product: null,
        error: `Error creando el producto: ${error.message || 'Error desconocido'}`,
        success: null
      });
    }
  }

  // Métodos de edición, borrado y activación pueden adaptarse igual que arriba
}

module.exports = ElectronicsController;
