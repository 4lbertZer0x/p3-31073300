const ProductRepository = require('../repositories/ProductRepository');
const ProductQueryBuilder = require('../services/ProductQueryBuilder');
const path = require('path');
const fs = require('fs').promises;

class ProductController {
  // Mostrar un producto público por id o slug
  static async showPublic(req, res) {
    try {
      const { Op } = require('sequelize');
      const DatabaseService = require('../services/DatabaseService');
      const repository = new ProductRepository(DatabaseService);
      
      // Permitir buscar por id o slug
      const { idslug } = req.params;
      let product = null;
      
      // Buscar por ID numérico o slug
      if (!isNaN(Number(idslug))) {
        product = await repository.findById(idslug);
      } else {
        product = await DatabaseService.Product.findOne({ where: { slug: idslug } });
      }
      
      if (!product) {
        return res.status(404).render('404', { 
          message: 'Producto no encontrado',
          user: req.session.user 
        });
      }
      
      // VERIFICAR Y PROCESAR IMÁGENES
      let images = [];
      let validatedImages = [];
      
      if (product.images && typeof product.images === 'string') {
        try {
          images = JSON.parse(product.images);
        } catch (e) {
          images = [product.images];
        }
      } else if (product.images) {
        images = product.images;
      }
      
      // Verificar cada imagen
      for (let img of images) {
        try {
          const isImageValid = await ProductController.verifyImageExists(img);
          if (isImageValid) {
            validatedImages.push(img);
          } else {
            console.warn(`⚠️ Imagen no encontrada: ${img}`);
            // Usar imagen por defecto si no existe
            validatedImages.push('/images/default-product.jpg');
          }
        } catch (error) {
          console.error(`❌ Error verificando imagen ${img}:`, error);
          validatedImages.push('/images/default-product.jpg');
        }
      }
      
      // Si no hay imágenes válidas, usar una por defecto
      if (validatedImages.length === 0) {
        validatedImages.push('/images/default-product.jpg');
      }
      
      // Obtener productos relacionados (misma categoría)
      const relatedProducts = await DatabaseService.Product.findAll({
        where: {
          category: product.category,
          id: { [Op.ne]: product.id } // Excluir el producto actual
        },
        limit: 4
      });
      
      // Procesar imágenes de productos relacionados
      const processedRelatedProducts = await Promise.all(
        relatedProducts.map(async (relatedProduct) => {
          let relatedImages = [];
          if (relatedProduct.images && typeof relatedProduct.images === 'string') {
            try {
              relatedImages = JSON.parse(relatedProduct.images);
            } catch (e) {
              relatedImages = [relatedProduct.images];
            }
          } else if (relatedProduct.images) {
            relatedImages = relatedProduct.images;
          }
          
          // Verificar primera imagen del producto relacionado
          let relatedImageUrl = '/images/default-product.jpg';
          if (relatedImages.length > 0) {
            const isValid = await ProductController.verifyImageExists(relatedImages[0]);
            relatedImageUrl = isValid ? relatedImages[0] : '/images/default-product.jpg';
          }
          
          return {
            ...relatedProduct.toJSON(),
            images: relatedImages,
            image_url: relatedImageUrl
          };
        })
      );
      
      // Preparar datos para la vista
      const productData = {
        id: product.id,
        name: product.name,
        description: product.description,
        full_description: product.full_description || product.description,
        price: product.price,
        original_price: product.original_price,
        images: validatedImages,
        image_url: validatedImages.length > 0 ? validatedImages[0] : '/images/default-product.jpg',
        category: product.category,
        brand: product.brand,
        sku: product.sku,
        stock: product.stock,
        rating: product.rating || 4.5,
        review_count: product.review_count || 0,
        is_new: product.is_new || false,
        on_sale: product.on_sale || false,
        free_shipping: product.free_shipping || true,
        weight: product.weight,
        dimensions: product.dimensions,
        specifications: product.specifications,
        reviews: product.reviews || [],
        created_at: product.created_at,
        has_valid_images: validatedImages.length > 0 && validatedImages[0] !== '/images/default-product.jpg'
      };
      
      // Renderizar la vista product.ejs
      return res.render('product', {
        title: `${productData.name} - ElectroTienda`,
        product: productData,
        relatedProducts: processedRelatedProducts,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('❌ Error en ProductController.showPublic:', error);
      return res.status(500).render('error', { 
        message: 'Error al cargar el producto',
        user: req.session.user 
      });
    }
  }
  
  // Verificar si una imagen existe en el servidor
  static async verifyImageExists(imagePath) {
    try {
      // Si es una URL externa, asumimos que existe
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return true;
      }
      
      // Si es una ruta relativa, verificar en el sistema de archivos
      const fullPath = path.join(process.cwd(), 'public', imagePath);
      
      // Verificar si el archivo existe y no está vacío
      const stats = await fs.stat(fullPath);
      return stats.isFile() && stats.size > 0;
      
    } catch (error) {
      console.warn(`⚠️ No se pudo verificar imagen ${imagePath}:`, error.message);
      return false;
    }
  }
  
  // Método para procesar imágenes al subir un producto
  static async processUploadedImages(files, productId = null) {
    try {
      if (!files || files.length === 0) {
        throw new Error('No se subieron imágenes');
      }
      
      const processedImages = [];
      
      for (let file of files) {
        // Verificar que el archivo se subió correctamente
        if (!file || !file.filename) {
          throw new Error('Error en el archivo de imagen');
        }
        
        // Construir ruta completa
        const uploadPath = path.join('public', 'uploads', 'products', file.filename);
        const relativePath = `/uploads/products/${file.filename}`;
        
        // Verificar que el archivo existe y no está vacío
        const stats = await fs.stat(uploadPath);
        if (stats.size === 0) {
          // Eliminar archivo vacío
          await fs.unlink(uploadPath);
          throw new Error('Imagen vacía o corrupta');
        }
        
        // Verificar tipo MIME
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
          await fs.unlink(uploadPath);
          throw new Error('Tipo de archivo no permitido');
        }
        
        // Verificar tamaño (máx 5MB)
        if (stats.size > 5 * 1024 * 1024) {
          await fs.unlink(uploadPath);
          throw new Error('Imagen demasiado grande (máx 5MB)');
        }
        
        processedImages.push(relativePath);
      }
      
      return processedImages;
      
    } catch (error) {
      // Limpiar archivos subidos si hay error
      if (files) {
        for (let file of files) {
          if (file && file.filename) {
            const uploadPath = path.join('public', 'uploads', 'products', file.filename);
            try {
              await fs.unlink(uploadPath);
            } catch (e) {
              console.warn(`No se pudo eliminar archivo ${uploadPath}:`, e.message);
            }
          }
        }
      }
      
      throw error;
    }
  }
  
  // Listar productos públicos con filtros (para tienda/categorías)
  static async listPublic(req, res) {
    try {
      const DatabaseService = require('../services/DatabaseService');
      const builder = new ProductQueryBuilder(DatabaseService);
      
      // Aplicar filtros
      builder
        .withPagination(req.query.page, req.query.limit)
        .filterByCategory(req.query.category)
        .filterByTags(req.query.tags)
        .filterByPrice(req.query.price_min, req.query.price_max)
        .search(req.query.search)
        .filterByBrand(req.query.brand)
        .filterByEdition(req.query.edition);
      
      // Obtener productos filtrados
      const { products, totalPages, currentPage, totalProducts } = await builder.getResults();
      
      // Procesar y verificar imágenes para cada producto
      const processedProducts = await Promise.all(
        products.map(async (product) => {
          let images = [];
          if (product.images && typeof product.images === 'string') {
            try {
              images = JSON.parse(product.images);
            } catch (e) {
              images = [product.images];
            }
          } else if (product.images) {
            images = product.images;
          }
          
          // Verificar primera imagen
          let mainImageUrl = '/images/default-product.jpg';
          if (images.length > 0) {
            const isValid = await ProductController.verifyImageExists(images[0]);
            mainImageUrl = isValid ? images[0] : '/images/default-product.jpg';
          }
          
          return {
            ...product.toJSON(),
            images: images,
            image_url: mainImageUrl,
            has_image: mainImageUrl !== '/images/default-product.jpg'
          };
        })
      );
      
      // Renderizar vista de tienda (shop.ejs) o devolver JSON para API
      if (req.accepts('html')) {
        return res.render('shop', {
          title: 'Tienda de Electrónicos',
          products: processedProducts,
          totalPages,
          currentPage,
          totalProducts,
          query: req.query,
          user: req.session.user
        });
      } else {
        return res.json({ 
          status: 'success', 
          data: {
            products: processedProducts,
            pagination: { totalPages, currentPage, totalProducts }
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error en ProductController.listPublic:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
  
  // Métodos para administración (CRUD) - PROTEGIDOS
  
  // Crear producto con validación de imágenes
  static async create(req, res) {
    try {
      const DatabaseService = require('../services/DatabaseService');
      const data = req.body;
      const { tagIds } = data;
      
      // Verificar que hay imágenes subidas
      if (!req.files || req.files.length === 0) {
        return res.status(400).render('admin/products/new', {
          title: 'Nuevo Producto',
          error: 'Debe subir al menos una imagen para el producto',
          user: req.session.user,
          product: data
        });
      }
      
      // Procesar y validar imágenes
      let images = [];
      try {
        images = await ProductController.processUploadedImages(req.files);
      } catch (imageError) {
        return res.status(400).render('admin/products/new', {
          title: 'Nuevo Producto',
          error: `Error en las imágenes: ${imageError.message}`,
          user: req.session.user,
          product: data
        });
      }
      
      // Guardar rutas de imágenes en el producto
      data.images = JSON.stringify(images);
      
      // Crear el producto
      const product = await DatabaseService.Product.create(data);
      
      if (tagIds && Array.isArray(tagIds)) {
        const tags = await DatabaseService.Tag.findAll({ where: { id: tagIds } });
        await product.setTags(tags);
      }
      
      // Redirigir a la página del producto
      return res.redirect(`/p/${product.id}`);
      
    } catch (error) {
      console.error('❌ Error en ProductController.create:', error);
      return res.status(500).render('admin/products/new', {
        title: 'Nuevo Producto',
        error: 'Error al crear el producto: ' + error.message,
        user: req.session.user,
        product: req.body
      });
    }
  }
  
  // Actualizar producto con validación de imágenes
  static async update(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;
      const { tagIds, deletedImages } = data;
      
      const DatabaseService = require('../services/DatabaseService');
      const repository = new ProductRepository(DatabaseService);
      
      // Obtener producto existente
      const existingProduct = await repository.findById(id);
      if (!existingProduct) {
        return res.status(404).render('admin/products/edit', {
          title: 'Editar Producto',
          error: 'Producto no encontrado',
          user: req.session.user,
          product: data
        });
      }
      
      // Procesar imágenes existentes
      let existingImages = [];
      if (existingProduct.images && typeof existingProduct.images === 'string') {
        try {
          existingImages = JSON.parse(existingProduct.images);
        } catch (e) {
          existingImages = [existingProduct.images];
        }
      } else if (existingProduct.images) {
        existingImages = existingProduct.images;
      }
      
      // Eliminar imágenes marcadas para borrar
      let finalImages = [...existingImages];
      if (deletedImages) {
        let deletedArray;
        try {
          deletedArray = JSON.parse(deletedImages);
        } catch (e) {
          deletedArray = [deletedImages];
        }
        
        finalImages = existingImages.filter(img => !deletedArray.includes(img));
        
        // Eliminar físicamente los archivos
        for (let img of deletedArray) {
          if (!img.startsWith('http')) {
            const filePath = path.join(process.cwd(), 'public', img);
            try {
              await fs.unlink(filePath);
            } catch (e) {
              console.warn(`No se pudo eliminar imagen ${img}:`, e.message);
            }
          }
        }
      }
      
      // Procesar nuevas imágenes subidas
      if (req.files && req.files.length > 0) {
        try {
          const newImages = await ProductController.processUploadedImages(req.files, id);
          finalImages = [...finalImages, ...newImages];
        } catch (imageError) {
          return res.status(400).render('admin/products/edit', {
            title: 'Editar Producto',
            error: `Error en las imágenes: ${imageError.message}`,
            user: req.session.user,
            product: { ...existingProduct.toJSON(), ...data }
          });
        }
      }
      
      // Verificar que al menos queda una imagen
      if (finalImages.length === 0) {
        return res.status(400).render('admin/products/edit', {
          title: 'Editar Producto',
          error: 'El producto debe tener al menos una imagen',
          user: req.session.user,
          product: { ...existingProduct.toJSON(), ...data }
        });
      }
       getById: async (req, res) => {
    try {
      console.log('🔍 ProductController.getById llamado con ID:', req.params.id);
      
      // Aquí va la lógica para buscar el producto por ID
      // Por ahora devuelve datos de prueba
      return res.json({
        status: 'success',
        data: {
          id: req.params.id,
          name: 'Producto de ejemplo',
          price: 99.99,
          description: 'Descripción del producto',
          category: 'electronics',
          stock: 10,
          images: ['/images/default-product.jpg']
        }
      });
    } catch (error) {
      console.error('❌ Error en ProductController.getById:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: error.message 
      });
    }
  },
      // Actualizar datos del producto
      data.images = JSON.stringify(finalImages);
      const updated = await repository.update(id, data);
      
      if (!updated) {
        return res.status(404).render('admin/products/edit', {
          title: 'Editar Producto',
          error: 'Producto no encontrado',
          user: req.session.user,
          product: data
        });
      }
      
      if (tagIds && Array.isArray(tagIds)) {
        const tags = await DatabaseService.Tag.findAll({ where: { id: tagIds } });
        await updated.setTags(tags);
      }
      
      // Redirigir a la página del producto
      return res.redirect(`/p/${id}`);
      
    } catch (error) {
      console.error('❌ Error en ProductController.update:', error);
      return res.status(500).render('admin/products/edit', {
        title: 'Editar Producto',
        error: 'Error al actualizar el producto: ' + error.message,
        user: req.session.user,
        product: req.body
      });
    }
  }
  
  // Eliminar producto y sus imágenes
  static async remove(req, res) {
    try {
      const id = req.params.id;
      const DatabaseService = require('../services/DatabaseService');
      const repository = new ProductRepository(DatabaseService);
      
      // Obtener producto para eliminar sus imágenes
      const product = await repository.findById(id);
      if (!product) {
        return res.status(404).json({ status: 'fail', message: 'Producto no encontrado' });
      }
      
      // Eliminar imágenes del servidor
      let images = [];
      if (product.images && typeof product.images === 'string') {
        try {
          images = JSON.parse(product.images);
        } catch (e) {
          images = [product.images];
        }
      } else if (product.images) {
        images = product.images;
      }
      
      // Eliminar archivos físicos
      for (let img of images) {
        if (!img.startsWith('http')) {
          const filePath = path.join(process.cwd(), 'public', img);
          try {
            await fs.unlink(filePath);
          } catch (e) {
            console.warn(`No se pudo eliminar imagen ${img}:`, e.message);
          }
        }
      }
      
      // Eliminar producto de la base de datos
      const ok = await repository.delete(id);
      
      if (!ok) {
        return res.status(404).json({ status: 'fail', message: 'Producto no encontrado' });
      }
      
      return res.json({ status: 'success', data: null });
      
    } catch (error) {
      console.error('❌ Error en ProductController.remove:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
  
  // Helper para obtener todos los productos (admin)
  static async getAllForAdmin(req, res) {
    try {
      const DatabaseService = require('../services/DatabaseService');
      const builder = new ProductQueryBuilder(DatabaseService);
      
      builder
        .withPagination(req.query.page, req.query.limit)
        .withAdminFilters()
        .search(req.query.search);
      
      const { products, totalPages, currentPage, totalProducts } = await builder.getResults();
      
      // Procesar productos con verificación de imágenes
      const processedProducts = await Promise.all(
        products.map(async (product) => {
          let images = [];
          if (product.images && typeof product.images === 'string') {
            try {
              images = JSON.parse(product.images);
            } catch (e) {
              images = [product.images];
            }
          } else if (product.images) {
            images = product.images;
          }
          
          // Verificar primera imagen
          let mainImageUrl = '/images/default-product.jpg';
          let hasValidImage = false;
          
          if (images.length > 0) {
            const isValid = await ProductController.verifyImageExists(images[0]);
            mainImageUrl = isValid ? images[0] : '/images/default-product.jpg';
            hasValidImage = isValid;
          }
          
          return {
            ...product.toJSON(),
            images: images,
            image_url: mainImageUrl,
            has_valid_image: hasValidImage
          };
        })
      );
      
      return res.render('admin/products/index', {
        title: 'Administrar Productos',
        products: processedProducts,
        totalPages,
        currentPage,
        totalProducts,
        query: req.query,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('❌ Error en ProductController.getAllForAdmin:', error);
      return res.status(500).render('error', {
        message: 'Error al cargar productos',
        user: req.session.user
      });
    }
  }
}

module.exports = ProductController;