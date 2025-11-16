const ProductRepository = require('../repositories/ProductRepository');
const ProductQueryBuilder = require('../services/ProductQueryBuilder');


class ProductController {
  // Admin protected
  static async create(req, res) {
    try {
      const DatabaseService = require('../services/DatabaseService');
      const data = req.body;
      // allow passing category_id and tagIds
      const { tagIds } = data;
      const product = await DatabaseService.Product.create(data);
      if (tagIds && Array.isArray(tagIds)) {
        const tags = await DatabaseService.Tag.findAll({ where: { id: tagIds } });
        await product.setTags(tags);
      }
      return res.status(201).json({ status: 'success', data: product });
    } catch (error) {
      console.error('Error en ProductController.listPublic:', error && error.stack ? error.stack : error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const DatabaseService = require('../services/DatabaseService');
      const repository = new ProductRepository(DatabaseService);
      const product = await repository.findById(req.params.id);
      if (!product) return res.status(404).json({ status: 'fail', message: 'Product no encontrado' });
      return res.json({ status: 'success', data: product });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;
      const tagIds = data.tagIds;
      const DatabaseService = require('../services/DatabaseService');
      const repository = new ProductRepository(DatabaseService);
      const updated = await repository.update(id, data);
      if (!updated) return res.status(404).json({ status: 'fail', message: 'Product no encontrado' });
      if (tagIds && Array.isArray(tagIds)) {
        const DatabaseService = require('../services/DatabaseService');
        const tags = await DatabaseService.Tag.findAll({ where: { id: tagIds } });
        await updated.setTags(tags);
      }
      return res.json({ status: 'success', data: updated });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async remove(req, res) {
    try {
      const id = req.params.id;
      const DatabaseService = require('../services/DatabaseService');
      const repository = new ProductRepository(DatabaseService);
      const ok = await repository.delete(id);
      if (!ok) return res.status(404).json({ status: 'fail', message: 'Product no encontrado' });
      return res.json({ status: 'success', data: null });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Public listing with filters and pagination
  static async listPublic(req, res) {
    try {
      const DatabaseService = require('../services/DatabaseService');
      const builder = new ProductQueryBuilder(DatabaseService);
      builder.withPagination(req.query.page, req.query.limit)
            .filterByCategory(req.query.category)
            .filterByTags(req.query.tags)
            .filterByPrice(req.query.price_min, req.query.price_max)
            .search(req.query.search)
            .filterByBrand(req.query.brand)
            .filterByEdition(req.query.edition)
            .filterByReleaseYear(req.query.release_year);

      const repository = new ProductRepository(DatabaseService);
      const result = await repository.findWithQuery(builder);
      if (!result) {
        console.error('ProductRepository.findWithQuery returned undefined');
        return res.status(500).json({ status: 'error', message: 'Internal error' });
      }
      return res.json({ status: 'success', count: result.count, data: result.rows });
    } catch (error) {
      console.error('Error en ProductController.listPublic:', error && error.stack ? error.stack : error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Public self-healing URL
  static async showPublic(req, res) {
    try {
      const raw = req.params.idslug; // expected like 123-mi-slug
      const parts = raw.split('-');
      const id = parts.shift();
      const slugFromUrl = parts.join('-');
      const DatabaseService = require('../services/DatabaseService');
      const repository = new ProductRepository(DatabaseService);
      const product = await repository.findById(id);
      if (!product) return res.status(404).json({ status: 'fail', message: 'Product no encontrado' });

      if (product.slug !== slugFromUrl) {
        // redirect to canonical
        const canonical = `/p/${product.id}-${product.slug}`;
        return res.redirect(301, canonical);
      }

      return res.json({ status: 'success', data: product });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = ProductController;
