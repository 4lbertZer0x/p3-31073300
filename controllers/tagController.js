const DatabaseService = require('../services/DatabaseService');

class TagController {
  static async list(req, res) {
    try {
      const tags = await DatabaseService.Tag.findAll({ order: [['name','ASC']] });
      return res.json({ status: 'success', data: tags });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ status: 'fail', message: 'name es requerido' });
      const tag = await DatabaseService.Tag.create({ name });
      return res.status(201).json({ status: 'success', data: tag });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const tag = await DatabaseService.Tag.findByPk(req.params.id);
      if (!tag) return res.status(404).json({ status: 'fail', message: 'Tag no encontrado' });
      return res.json({ status: 'success', data: tag });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const tag = await DatabaseService.Tag.findByPk(req.params.id);
      if (!tag) return res.status(404).json({ status: 'fail', message: 'Tag no encontrado' });
      const { name } = req.body;
      await tag.update({ name });
      return res.json({ status: 'success', data: tag });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async remove(req, res) {
    try {
      const tag = await DatabaseService.Tag.findByPk(req.params.id);
      if (!tag) return res.status(404).json({ status: 'fail', message: 'Tag no encontrado' });
      await tag.destroy();
      return res.json({ status: 'success', data: null });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = TagController;
