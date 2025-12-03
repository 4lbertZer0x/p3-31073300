const DatabaseService = require('../services/DatabaseService');

class HomeController {
  /**
   * Ruta de prueba para asociaciones de modelos
   */
  static async testAssociations(req, res) {
    try {
      res.json({
        success: true,
        message: 'Asociaciones de modelos funcionando correctamente',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  /**
   * Mostrar página de inicio (Tienda de Electrónicos)
   */
  static async showHome(req, res) {
    try {
      console.log('🏠 Cargando página de inicio de ElectroTienda...');
      
      // Manejar sesión undefined de forma segura
      const user = req.session && req.session.user ? req.session.user : null;
      
      console.log('👤 Estado de sesión:', {
        hasSession: !!req.session,
        hasUser: !!user,
        userId: user ? user.id : 'No user'
      });

      // Si tienes un modelo de Producto en DatabaseService, úsalo
      // Si no, usa datos de ejemplo
      let products = [];
      
      try {
        // Intentar obtener productos de la base de datos
        // Asegúrate de que DatabaseService tenga un modelo Product
        if (DatabaseService.Product) {
          console.log('🛍️ Buscando productos en la base de datos...');
          products = await DatabaseService.Product.findAll({
            limit: 12,
            order: [['created_at', 'DESC']]
          });
          
          console.log(`✅ Encontrados ${products.length} productos`);
        } else {
          console.log('ℹ️ No se encontró modelo Product, usando datos de ejemplo');
          products = HomeController.getSampleProducts();
        }
      } catch (dbError) {
        console.warn('⚠️ Error al obtener productos de BD, usando datos de ejemplo:', dbError.message);
        products = HomeController.getSampleProducts();
      }

      // Procesar los productos para la vista
      const processedProducts = products.map(product => {
        const productData = product.toJSON ? product.toJSON() : product;
        
        // Asegurar que todos los campos necesarios existan
        return {
          id: productData.id || 0,
          title: productData.title || 'Producto sin nombre',
          description: productData.description || 'Descripción no disponible',
          price: productData.price || 0.00,
          rating: productData.rating || 4.0,
          review_count: productData.review_count || 0,
          free_shipping: productData.free_shipping !== undefined ? productData.free_shipping : true,
          icon: productData.icon || this.getIconForCategory(productData.category),
          category: productData.category || 'electronics',
          image_url: productData.image_url || null,
          stock: productData.stock || 10,
          created_at: productData.created_at || new Date()
        };
      });

      console.log('📦 Productos procesados:', processedProducts.length);

      res.render('home', {
        title: 'ElectroTienda - Tu tienda de electrónicos online',
        user: user,
        products: processedProducts,
        success: req.query.success,
        error: req.query.error
      });

    } catch (error) {
      console.error('❌ Error cargando página de inicio:', error);
      
      // Manejar sesión undefined en el catch
      const user = req.session && req.session.user ? req.session.user : null;
      
      // Usar productos de ejemplo en caso de error
      const sampleProducts = HomeController.getSampleProducts();

      res.render('home', {
        title: 'ElectroTienda',
        user: user,
        products: sampleProducts,
        error: 'Error al cargar los productos. Mostrando productos de ejemplo.'
      });
    }
  }

  /**
   * Datos de ejemplo de productos
   */
  static getSampleProducts() {
    return [
      {
        id: 1,
        title: 'iPhone 15 Pro Max 256GB',
        description: 'El smartphone más avanzado de Apple con cámara profesional y pantalla Super Retina XDR',
        price: 1299.99,
        rating: 4.5,
        review_count: 342,
        free_shipping: true,
        icon: 'mobile-alt',
        category: 'smartphones',
        stock: 15,
        created_at: new Date()
      },
      {
        id: 2,
        title: 'Laptop Dell XPS 15',
        description: 'Laptop profesional con pantalla 4K OLED, procesador Intel i9 y 32GB RAM',
        price: 1899.99,
        rating: 4.7,
        review_count: 128,
        free_shipping: true,
        icon: 'laptop',
        category: 'computers',
        stock: 8,
        created_at: new Date()
      },
      {
        id: 3,
        title: 'PlayStation 5 + 2 Mandos',
        description: 'Consola de última generación con disco de 825GB y tecnología Ray Tracing',
        price: 499.99,
        rating: 4.8,
        review_count: 567,
        free_shipping: true,
        icon: 'gamepad',
        category: 'gaming',
        stock: 25,
        created_at: new Date()
      },
      {
        id: 4,
        title: 'Auriculares Sony WH-1000XM5',
        description: 'Cancelación de ruido premium con 30h de batería y calidad de sonido Hi-Res',
        price: 349.99,
        rating: 4.6,
        review_count: 234,
        free_shipping: true,
        icon: 'headphones',
        category: 'audio',
        stock: 30,
        created_at: new Date()
      },
      {
        id: 5,
        title: 'Smartwatch Apple Watch Series 9',
        description: 'Reloj inteligente con ECG, monitor de sueño y resistencia al agua',
        price: 399.99,
        rating: 4.4,
        review_count: 189,
        free_shipping: true,
        icon: 'smartwatch',
        category: 'wearables',
        stock: 20,
        created_at: new Date()
      },
      {
        id: 6,
        title: 'Tablet Samsung Galaxy Tab S9',
        description: 'Tablet AMOLED de 12.4" con S Pen incluido y procesador Snapdragon 8 Gen 2',
        price: 899.99,
        rating: 4.3,
        review_count: 76,
        free_shipping: false,
        icon: 'tablet-alt',
        category: 'tablets',
        stock: 12,
        created_at: new Date()
      },
      {
        id: 7,
        title: 'Cámara Sony Alpha 7 III',
        description: 'Cámara mirrorless full frame 24MP para fotografía y video profesional',
        price: 1999.99,
        rating: 4.9,
        review_count: 89,
        free_shipping: true,
        icon: 'camera',
        category: 'cameras',
        stock: 5,
        created_at: new Date()
      },
      {
        id: 8,
        title: 'Altavoz inteligente Echo Dot 5a Gen',
        description: 'Asistente de voz Alexa con sonido mejorado y control de dispositivos inteligentes',
        price: 49.99,
        rating: 4.2,
        review_count: 543,
        free_shipping: true,
        icon: 'assistive-listening-systems',
        category: 'smart-home',
        stock: 50,
        created_at: new Date()
      },
      {
        id: 9,
        title: 'Monitor Gaming 27" 144Hz',
        description: 'Monitor QHD 2560x1440, 144Hz, 1ms para gaming competitivo',
        price: 299.99,
        rating: 4.5,
        review_count: 156,
        free_shipping: false,
        icon: 'tv',
        category: 'monitors',
        stock: 18,
        created_at: new Date()
      },
      {
        id: 10,
        title: 'Teclado Mecánico RGB Gaming',
        description: 'Teclado mecánico con switches Blue, retroiluminación RGB y diseño ergonómico',
        price: 89.99,
        rating: 4.1,
        review_count: 203,
        free_shipping: true,
        icon: 'keyboard',
        category: 'accessories',
        stock: 35,
        created_at: new Date()
      },
      {
        id: 11,
        title: 'Drone DJI Mini 3 Pro',
        description: 'Drone profesional con cámara 4K, 48MP y autonomía de 34 minutos',
        price: 759.99,
        rating: 4.7,
        review_count: 94,
        free_shipping: true,
        icon: 'drone',
        category: 'drones',
        stock: 7,
        created_at: new Date()
      },
      {
        id: 12,
        title: 'Router Wi-Fi 6 Mesh 3 Pack',
        description: 'Sistema Mesh Wi-Fi 6 para cobertura total en toda la casa',
        price: 249.99,
        rating: 4.4,
        review_count: 67,
        free_shipping: true,
        icon: 'wifi',
        category: 'networking',
        stock: 22,
        created_at: new Date()
      }
    ];
  }

  /**
   * Obtener icono según categoría
   */
  static getIconForCategory(category) {
    const iconMap = {
      'smartphones': 'mobile-alt',
      'computers': 'laptop',
      'gaming': 'gamepad',
      'audio': 'headphones',
      'wearables': 'smartwatch',
      'tablets': 'tablet-alt',
      'cameras': 'camera',
      'smart-home': 'home',
      'monitors': 'tv',
      'accessories': 'keyboard',
      'drones': 'drone',
      'networking': 'wifi',
      'electronics': 'microchip'
    };
    
    return iconMap[category] || 'box';
  }

  /**
   * Buscar productos
   */
  static async searchProducts(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      const query = req.query.q || '';
      
      console.log(`🔍 Buscando productos: "${query}"`);
      
      let products = [];
      
      if (query.trim()) {
        // Si tienes modelo Product y quieres buscar en BD
        if (DatabaseService.Product) {
          const { Op } = require('sequelize');
          products = await DatabaseService.Product.findAll({
            where: {
              [Op.or]: [
                { title: { [Op.like]: `%${query}%` } },
                { description: { [Op.like]: `%${query}%` } },
                { category: { [Op.like]: `%${query}%` } }
              ]
            },
            limit: 20
          });
        } else {
          // Filtrar productos de ejemplo
          const sampleProducts = this.getSampleProducts();
          const searchTerm = query.toLowerCase();
          products = sampleProducts.filter(product => 
            product.title.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
          );
        }
      } else {
        products = this.getSampleProducts().slice(0, 12);
      }
      
      res.render('home', {
        title: `Buscar: ${query} - ElectroTienda`,
        user: user,
        products: products,
        searchQuery: query,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('❌ Error en búsqueda de productos:', error);
      res.render('home', {
        title: 'ElectroTienda',
        user: req.session && req.session.user ? req.session.user : null,
        products: [],
        error: 'Error en la búsqueda'
      });
    }
  }

  /**
   * Mostrar productos por categoría
   */
  static async showCategory(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      const category = req.params.category;
      
      console.log(`📂 Mostrando categoría: ${category}`);
      
      let products = [];
      
      // Si tienes modelo Product
      if (DatabaseService.Product) {
        products = await DatabaseService.Product.findAll({
          where: { category: category },
          limit: 20
        });
      } else {
        // Filtrar productos de ejemplo por categoría
        const sampleProducts = this.getSampleProducts();
        products = sampleProducts.filter(product => 
          product.category === category
        );
      }
      
      const categoryNames = {
        'smartphones': 'Smartphones',
        'computers': 'Computadoras y Laptops',
        'gaming': 'Videojuegos',
        'audio': 'Audio y Sonido',
        'wearables': 'Wearables',
        'tablets': 'Tablets',
        'cameras': 'Cámaras',
        'smart-home': 'Smart Home',
        'monitors': 'Monitores',
        'accessories': 'Accesorios',
        'drones': 'Drones',
        'networking': 'Redes'
      };
      
      res.render('category', {
        title: `${categoryNames[category] || category} - ElectroTienda`,
        user: user,
        products: products,
        category: category,
        categoryName: categoryNames[category] || category
      });
    } catch (error) {
      console.error('❌ Error mostrando categoría:', error);
      res.redirect('/?error=Error al cargar la categoría');
    }
  }

  /**
   * Mostrar detalles de producto
   */
  static async showProduct(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      const productId = req.params.id;
      
      console.log(`📦 Mostrando producto ID: ${productId}`);
      
      let product = null;
      
      // Si tienes modelo Product
      if (DatabaseService.Product) {
        product = await DatabaseService.Product.findByPk(productId);
      } else {
        // Buscar en productos de ejemplo
        const sampleProducts = this.getSampleProducts();
        product = sampleProducts.find(p => p.id === parseInt(productId));
      }
      
      if (!product) {
        return res.redirect('/?error=Producto no encontrado');
      }
      
      res.render('product', {
        title: `${product.title} - ElectroTienda`,
        user: user,
        product: product
      });
    } catch (error) {
      console.error('❌ Error mostrando producto:', error);
      res.redirect('/?error=Error al cargar el producto');
    }
  }

  /**
   * Ruta de prueba para verificar funcionamiento
   */
  static async test(req, res) {
    try {
      console.log('🔍 Probando HomeController...');
      
      res.json({
        success: true,
        message: 'HomeController funcionando correctamente',
        sampleProductsCount: this.getSampleProducts().length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error en test:', error);
      res.json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mostrar página about
   */
  static async showAbout(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      
      res.render('about', {
        title: 'Acerca de - ElectroTienda',
        user: user
      });
    } catch (error) {
      console.error('Error cargando página about:', error);
      res.redirect('/?error=Error al cargar la página');
    }
  }

  /**
   * Mostrar página de contacto
   */
  static async showContact(req, res) {
    try {
      const user = req.session && req.session.user ? req.session.user : null;
      
      res.render('contact', {
        title: 'Contacto - ElectroTienda',
        user: user
      });
    } catch (error) {
      console.error('Error cargando página de contacto:', error);
      res.redirect('/?error=Error al cargar la página');
    }
  }
}

module.exports = HomeController;