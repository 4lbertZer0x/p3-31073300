// check-product-controller.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando ProductController...\n');

// 1. Verificar si el archivo existe
const controllerPath = path.join(__dirname, 'controllers', 'productController.js');
console.log('📁 Ruta del controlador:', controllerPath);

if (fs.existsSync(controllerPath)) {
  console.log('✅ Archivo productController.js EXISTE');
  
  // 2. Leer contenido
  const content = fs.readFileSync(controllerPath, 'utf8');
  
  // 3. Verificar métodos requeridos
  const requiredMethods = ['getById', 'create', 'update', 'remove', 'listPublic', 'showPublic'];
  
  console.log('\n🔍 Métodos encontrados:');
  requiredMethods.forEach(method => {
    if (content.includes(method)) {
      console.log(`  ✅ ${method}`);
    } else {
      console.log(`  ❌ ${method} - NO ENCONTRADO`);
    }
  });
  
  // 4. Verificar export
  if (content.includes('module.exports')) {
    console.log('\n✅ module.exports encontrado');
  } else {
    console.log('\n❌ module.exports NO encontrado');
  }
  
  // 5. Verificar variable exportada
  if (content.includes('ProductController')) {
    console.log('✅ ProductController variable encontrada');
  } else {
    console.log('❌ ProductController variable NO encontrada');
  }
  
} else {
  console.log('❌ Archivo productController.js NO EXISTE');
  console.log('\n🔧 Creando controlador básico...');
  
  const basicController = `// controllers/productController.js - CONTROLADOR BÁSICO

const ProductController = {
  getById: async (req, res) => {
    try {
      return res.json({
        status: 'success',
        data: {
          id: req.params.id,
          name: 'Producto de prueba',
          price: 99.99,
          description: 'Descripción del producto'
        }
      });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  },
  
  create: async (req, res) => {
    return res.status(501).json({ error: 'Método no implementado' });
  },
  
  update: async (req, res) => {
    return res.status(501).json({ error: 'Método no implementado' });
  },
  
  remove: async (req, res) => {
    return res.status(501).json({ error: 'Método no implementado' });
  },
  
  listPublic: async (req, res) => {
    try {
      return res.render('shop', {
        title: 'Tienda',
        products: [],
        user: req.session?.user || null
      });
    } catch (error) {
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar productos',
        user: req.session?.user || null
      });
    }
  },
  
  showPublic: async (req, res) => {
    try {
      const product = {
        id: req.params.idslug,
        name: 'Producto de prueba',
        price: 99.99,
        description: 'Descripción del producto',
        images: ['/images/default-product.jpg'],
        stock: 10
      };
      
      return res.render('product', {
        title: product.name,
        product: product,
        relatedProducts: [],
        user: req.session?.user || null
      });
    } catch (error) {
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Error al cargar el producto',
        user: req.session?.user || null
      });
    }
  }
};

module.exports = ProductController;`;
  
  fs.writeFileSync(controllerPath, basicController);
  console.log('✅ Controlador básico creado');
}