const { Op } = require('sequelize');

class ProductQueryBuilder {
  constructor(models) {
    this.models = models;
    this.where = { };
    this.include = [];
    this.limit = 20;
    this.offset = 0;
    this.order = [['created_at','DESC']];
  }

  withPagination(page = 1, limit = 20) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    this.limit = l;
    this.offset = (p - 1) * l;
    return this;
  }

  filterByCategory(category) {
    if (!category) return this;
    // allow ID or name
    if (Number.isInteger(Number(category))) {
      this.where.category_id = Number(category);
    } else {
      // join Category by name
      this.include.push({ model: this.models.Category, where: { name: category } });
    }
    return this;
  }

  filterByTags(tagIds) {
    if (!tagIds) return this;
    const ids = Array.isArray(tagIds) ? tagIds : String(tagIds).split(',').map(x => Number(x.trim())).filter(Boolean);
    if (ids.length === 0) return this;
    this.include.push({ model: this.models.Tag, where: { id: { [Op.in]: ids } } });
    return this;
  }

  filterByPrice(min, max) {
    if (min != null || max != null) {
      this.where.price = {};
      if (min != null) this.where.price[Op.gte] = Number(min);
      if (max != null) this.where.price[Op.lte] = Number(max);
    }
    return this;
  }

  search(term) {
    if (!term) return this;
    this.where[Op.or] = [
      { name: { [Op.like]: `%${term}%` } },
      { description: { [Op.like]: `%${term}%` } }
    ];
    return this;
  }

  // custom filters for 'Figuras de Colección'
  filterByBrand(brand) {
    if (!brand) return this;
    this.where.brand = brand;
    return this;
  }

  filterByEdition(edition) {
    if (!edition) return this;
    this.where.edition = edition;
    return this;
  }

  filterByReleaseYear(year) {
    if (!year) return this;
    this.where.release_year = Number(year);
    return this;
  }

  // Filtrar por tipo de producto: 'purchase' o 'membership'
  filterByKind(kind) {
    if (!kind) return this;
    this.where.kind = kind;
    return this;
  }

  // Buscar por un beneficio dentro del JSON membership_benefits. En sqlite no
  // tenemos funciones JSON avanzadas, así que hacemos una búsqueda LIKE sobre
  // la representación JSON para permitir búsqueda simple por palabra.
  filterByMembershipBenefit(term) {
    if (!term) return this;
    // guardamos como búsqueda LIKE para compatibilidad
    this.where.membership_benefits = { [Op.like]: `%${term}%` };
    return this;
  }

  build() {
    // Ensure includes are unique by model
    const uniqIncludes = [];
    const seen = new Set();
    for (const inc of this.include) {
      let key;
      if (inc.model && inc.model.name) {
        key = inc.model.name;
      } else if (inc.where) {
        try {
          key = 'where:' + JSON.stringify(inc.where);
        } catch (e) {
          key = 'where:unknown';
        }
      } else {
        try {
          key = JSON.stringify(inc);
        } catch (e) {
          key = String(inc);
        }
      }
      if (!seen.has(key)) {
        uniqIncludes.push(inc);
        seen.add(key);
      }
    }
    return { where: this.where, include: uniqIncludes, limit: this.limit, offset: this.offset, order: this.order };
  }
}

module.exports = ProductQueryBuilder;
