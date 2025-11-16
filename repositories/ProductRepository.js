class ProductRepository {
  constructor(models) {
    this.Product = models.Product;
    this.Category = models.Category;
    this.Tag = models.Tag;
    // Optional related models (may be undefined in some test mocks)
    this.Movie = models.Movie || null;
    this.Series = models.Series || null;
  }

  async findById(id, options = {}) {
    return await this.Product.findByPk(id, {
      include: [this.Category, this.Tag],
      ...options
    });
  }

  async create(data) {
    return await this.Product.create(data);
  }

  async update(id, data) {
    const item = await this.Product.findByPk(id);
    if (!item) return null;
    return await item.update(data);
  }

  async delete(id) {
    const item = await this.Product.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
  }

  // Ejecuta una consulta construida por el QueryBuilder
  async findWithQuery(queryBuilder) {
    try {
      const built = queryBuilder.build();
      const { where, include, limit, offset, order } = built || {};
      const res = await this.Product.findAndCountAll({ where, include, limit, offset, order, distinct: true });
      // Ensure a valid return value
      if (!res) return { count: 0, rows: [] };

      // If there are polymorphic product references (productable_type/productable_id)
      // resolve them per-row and attach as `productable` in each row's dataValues.
      const rows = res.rows || [];
      await Promise.all(rows.map(async (r) => {
        try {
          const type = r.productable_type;
          const pid = r.productable_id;
          if (!type || !pid) return;
          let related = null;
          if (type === 'Movie' && this.Movie) {
            related = await this.Movie.findByPk(pid);
          } else if (type === 'Series' && this.Series) {
            related = await this.Series.findByPk(pid);
          }
          // attach without modifying the DB instance fields
          if (related) r.dataValues.productable = related;
        } catch (err) {
          console.error('Error resolving productable for product id', r.id, err && err.stack ? err.stack : err);
        }
      }));

      return { count: res.count, rows };
    } catch (error) {
      console.error('Error in ProductRepository.findWithQuery:', error && error.stack ? error.stack : error);
      return { count: 0, rows: [] };
    }
  }
}

module.exports = ProductRepository;
