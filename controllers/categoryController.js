const DatabaseService = require('../services/DatabaseService');

class CategoryController {
  static async list(req, res) {
    try {
      const categories = await DatabaseService.Category.findAll({ order: [['name','ASC']] });
      return res.json({ status: 'success', data: categories });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ status: 'fail', message: 'name es requerido' });
      const category = await DatabaseService.Category.create({ name, description });
      return res.status(201).json({ status: 'success', data: category });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const category = await DatabaseService.Category.findByPk(req.params.id);
      if (!category) return res.status(404).json({ status: 'fail', message: 'Category no encontrada' });
      return res.json({ status: 'success', data: category });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const category = await DatabaseService.Category.findByPk(req.params.id);
      if (!category) return res.status(404).json({ status: 'fail', message: 'Category no encontrada' });
      const { name, description } = req.body;
      await category.update({ name, description });
      return res.json({ status: 'success', data: category });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async remove(req, res) {
    try {
      const category = await DatabaseService.Category.findByPk(req.params.id);
      if (!category) return res.status(404).json({ status: 'fail', message: 'Category no encontrada' });
      await category.destroy();
      return res.json({ status: 'success', data: null });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = CategoryController;
