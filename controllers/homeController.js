const DatabaseService = require('../services/DatabaseService');

class HomeController {
  /**
   * Mostrar página de inicio (Tienda de Electrónicos) - VERSIÓN CORREGIDA
   */
 static async showHome(req, res) {
  try {
    console.log('🏠 Cargando página de inicio...');
    
    // Obtener productos
    let products = [];
    
    try {
      products = await DatabaseService.Product.findAll({
        limit: 12,
        order: [['created_at', 'DESC']]
      });
      
      console.log(`📦 Encontrados ${products.length} productos en BD`);
    } catch (dbError) {
      console.warn('⚠️ Error en BD, usando productos de ejemplo:', dbError.message);
      products = HomeController.getSampleProducts();
    }
    
    // Procesar imágenes y asegurar categorías
    const processProductImages = (product) => {
      const productData = product.toJSON ? product.toJSON() : product;
      
      let images = [];
      if (productData.images && typeof productData.images === 'string') {
        try {
          images = JSON.parse(productData.images);
        } catch (e) {
          images = [productData.images];
        }
      } else if (productData.images) {
        images = productData.images;
      }
      
      const productDate = productData.created_at || new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isNew = new Date(productDate) > thirtyDaysAgo;
      
      const originalPrice = productData.original_price || productData.price * 1.2;
      const onSale = originalPrice > productData.price;
      
      return {
        id: productData.id || 0,
        name: productData.name || productData.title || 'Producto sin nombre',
        description: productData.description || 'Descripción no disponible',
        price: parseFloat(productData.price) || 0,
        original_price: parseFloat(originalPrice) || 0,
        images: images,
        image_url: images.length > 0 ? images[0] : '/images/default-product.jpg',
        category: productData.category || 'electronics', // ← VALOR POR DEFECTO
        brand: productData.brand || '',
        sku: productData.sku || '',
        stock: productData.stock || 0,
        rating: productData.rating || 4.5,
        review_count: productData.review_count || 0,
        is_new: isNew,
        on_sale: onSale,
        free_shipping: productData.free_shipping || true
      };
    };
    
    const processedProducts = products.map(processProductImages);
    
    return res.render('home', {
      title: 'ElectroTienda - Tecnología al Mejor Precio',
      products: processedProducts,
      user: req.session.user || null,
      success: req.flash('success') || null,
      error: req.flash('error') || null,
      category: null,
      categoryName: 'Productos Destacados',
      searchQuery: ''
    });
    
  } catch (error) {
    console.error('❌ Error en homeController.showHome:', error);
    
    return res.status(500).render('error', {
      title: 'Error - ElectroTienda',
      message: 'Error al cargar la página de inicio',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
      user: req.session.user || null
    });
  }
}

  /**
   * Datos de ejemplo de productos (actualizado)
   */
  static getSampleProducts() {
    return [
      {
        id: 1,
        name: 'iPhone 15 Pro Max 256GB',
        title: 'iPhone 15 Pro Max 256GB',
        description: 'El smartphone más avanzado de Apple con cámara profesional y pantalla Super Retina XDR',
        price: 1299.99,
        original_price: 1399.99,
        rating: 4.5,
        review_count: 342,
        free_shipping: true,
        images: ['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1693009279096'],
        category: 'smartphones',
        brand: 'Apple',
        stock: 15,
        created_at: new Date('2023-12-01')
      },
      {
        id: 2,
        name: 'Laptop Dell XPS 15',
        title: 'Laptop Dell XPS 15',
        description: 'Laptop profesional con pantalla 4K OLED, procesador Intel i9 y 32GB RAM',
        price: 1899.99,
        original_price: 1999.99,
        rating: 4.7,
        review_count: 128,
        free_shipping: true,
        images: ['https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-15-9530/media-gallery/notebook-xps-15-9530-nt-black-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=536&qlt=100,1&resMode=sharp2&size=536,402&chrss=full'],
        category: 'computers',
        brand: 'Dell',
        stock: 8,
        created_at: new Date('2023-11-15')
      },
      {
        id: 3,
        name: 'PlayStation 5 + 2 Mandos',
        title: 'PlayStation 5 + 2 Mandos',
        description: 'Consola de última generación con disco de 825GB y tecnología Ray Tracing',
        price: 499.99,
        rating: 4.8,
        review_count: 567,
        free_shipping: true,
        images: ['https://media.direct.playstation.com/is/image/psdglobal/PS5-console-front'],
        category: 'gaming',
        brand: 'Sony',
        stock: 25,
        created_at: new Date('2023-10-20')
      },
      {
        id: 4,
        name: 'Auriculares Sony WH-1000XM5',
        title: 'Auriculares Sony WH-1000XM5',
        description: 'Cancelación de ruido premium con 30h de batería y calidad de sonido Hi-Res',
        price: 349.99,
        original_price: 399.99,
        rating: 4.6,
        review_count: 234,
        free_shipping: true,
        images: ['https://www.sony.com/image/7d6e2139f804b82a10b6c7a6c50e75c8?fmt=pjpeg&bgcolor=FFFFFF&bgc=FFFFFF&wid=2515&hei=1320'],
        category: 'audio',
        brand: 'Sony',
        stock: 30,
        created_at: new Date('2023-12-10')
      },
      {
        id: 5,
        name: 'Samsung Galaxy Tab S9 Ultra',
        title: 'Samsung Galaxy Tab S9 Ultra',
        description: 'Tablet premium con pantalla Dynamic AMOLED 2X de 14.6" y S Pen incluido',
        price: 1199.99,
        rating: 4.4,
        review_count: 89,
        free_shipping: true,
        images: ['https://images.samsung.com/is/image/samsung/p6pim/es/feature/164803662/feature--gallery-501926436?$FB_TYPE_A_MO_JPG$'],
        category: 'tablets',
        brand: 'Samsung',
        stock: 12,
        created_at: new Date('2023-11-05')
      },
      {
        id: 6,
        name: 'Apple Watch Series 9',
        title: 'Apple Watch Series 9',
        description: 'Smartwatch con monitorización de salud avanzada y pantalla Always-On',
        price: 429.99,
        original_price: 449.99,
        rating: 4.7,
        review_count: 312,
        free_shipping: true,
        images: ['https://www.apple.com/newsroom/images/product/watch/standard/Apple-Watch-S9-hero-230912.jpg.og.jpg'],
        category: 'wearables',
        brand: 'Apple',
        stock: 18,
        created_at: new Date('2023-12-05')
      }
    ];
  }

  // ... (el resto de tus métodos se mantienen igual, pero asegúrate de que showProduct también maneje imágenes correctamente)

  /**
   * Mostrar detalles de producto - VERSIÓN ACTUALIZADA
   */
static async showProduct(req, res) {
  try {
    const productId = req.params.id;
    console.log(`📦 Mostrando producto ID: ${productId}`);
    
    let product = null;
    
    // Intentar obtener de la base de datos
    if (DatabaseService.Product) {
      product = await DatabaseService.Product.findByPk(productId);
    }
    
    // Si no está en BD, buscar en productos de ejemplo
    if (!product) {
      const sampleProducts = HomeController.getSampleProducts();
      product = sampleProducts.find(p => p.id === parseInt(productId));
    }
    
    if (!product) {
      return res.status(404).render('error', {
        title: 'Producto no encontrado',
        message: 'El producto solicitado no existe',
        user: req.session.user || null
      });
    }
    
    const productData = product.toJSON ? product.toJSON() : product;
    
    // Procesar imágenes
    let images = [];
    if (productData.images && typeof productData.images === 'string') {
      try {
        images = JSON.parse(productData.images);
      } catch (e) {
        images = [productData.images];
      }
    } else if (Array.isArray(productData.images)) {
      images = productData.images;
    } else if (productData.image_url) {
      images = [productData.image_url];
    }
    
    // Obtener productos relacionados (sin usar category por ahora)
    let relatedProducts = [];
    try {
      if (DatabaseService.Product) {
        const { Op } = require('sequelize');
        // Buscar productos relacionados por ID (excluyendo el actual)
        relatedProducts = await DatabaseService.Product.findAll({
          where: {
            id: { [Op.ne]: productData.id }
          },
          limit: 4,
          order: [['created_at', 'DESC']]
        });
        console.log(`🔗 Encontrados ${relatedProducts.length} productos sugeridos`);
      }
    } catch (relatedError) {
      console.warn('⚠️ No se pudieron obtener productos relacionados:', relatedError.message);
      // Usar productos de ejemplo
      const sampleProducts = HomeController.getSampleProducts();
      relatedProducts = sampleProducts.filter(p => p.id !== productData.id).slice(0, 4);
    }
    
    // Procesar productos relacionados
    const processedRelated = relatedProducts.map(p => {
      const pData = p.toJSON ? p.toJSON() : p;
      let pImages = [];
      
      if (pData.images && typeof pData.images === 'string') {
        try {
          pImages = JSON.parse(pData.images);
        } catch (e) {
          pImages = [pData.images];
        }
      } else if (Array.isArray(pData.images)) {
        pImages = pData.images;
      }
      
      return {
        ...pData,
        image_url: pImages.length > 0 ? pImages[0] : '/images/default-product.jpg'
      };
    });
    
    // Preparar datos del producto para la vista
    const productForView = {
      ...productData,
      id: productData.id || 0,
      name: productData.name || productData.title || 'Producto sin nombre',
      description: productData.description || 'Descripción no disponible',
      price: parseFloat(productData.price) || 0,
      original_price: parseFloat(productData.original_price) || 0,
      category: productData.category || 'electronics',
      images: images,
      image_url: images.length > 0 ? images[0] : '/images/default-product.jpg',
      stock: productData.stock || 0,
      rating: productData.rating || 4.5,
      review_count: productData.review_count || 0,
      is_new: productData.is_new || false,
      on_sale: productData.on_sale || false,
      free_shipping: productData.free_shipping || true,
      brand: productData.brand || '',
      sku: productData.sku || ''
    };
    
    // Pasar URL base para compartir
    const baseUrl = `${req.protocol}://${req.headers.host}`;
    const shareUrl = `${baseUrl}/p/${productForView.id}`;
    
    res.render('product', {
      title: `${productForView.name} - ElectroTienda`,
      user: req.session.user || null,
      product: productForView,
      relatedProducts: processedRelated,
      searchQuery: '',
      shareUrl: shareUrl, // ← Pasar la URL completa
      baseUrl: baseUrl    // ← Pasar la URL base
    });
    
  } catch (error) {
    console.error('❌ Error mostrando producto:', error);
    return res.status(500).render('error', {
      title: 'Error - ElectroTienda',
      message: 'Error al cargar el producto',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
      user: req.session.user || null
    });
  }
}
}

module.exports = HomeController;