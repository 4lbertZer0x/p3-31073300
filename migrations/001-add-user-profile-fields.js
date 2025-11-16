// migrations/001-add-user-profile-fields.js
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Agregando campos de perfil de usuario...');
    
    try {
      // Verificar si las columnas ya existen antes de agregarlas
      const tableInfo = await queryInterface.describeTable('users');
      
      if (!tableInfo.full_name) {
        await queryInterface.addColumn('users', 'full_name', {
          type: DataTypes.STRING,
          allowNull: true
        });
        console.log('✅ Campo full_name agregado');
      }
      
      if (!tableInfo.membership_type) {
        await queryInterface.addColumn('users', 'membership_type', {
          type: DataTypes.ENUM('free', 'premium', 'vip'),
          defaultValue: 'free'
        });
        console.log('✅ Campo membership_type agregado');
      }
      
      if (!tableInfo.membership_expires) {
        await queryInterface.addColumn('users', 'membership_expires', {
          type: DataTypes.DATE,
          allowNull: true
        });
        console.log('✅ Campo membership_expires agregado');
      }
      
      if (!tableInfo.purchase_history) {
        await queryInterface.addColumn('users', 'purchase_history', {
          type: DataTypes.TEXT,
          defaultValue: '[]'
        });
        console.log('✅ Campo purchase_history agregado');
      }
      
      console.log('🎉 Todos los campos de perfil de usuario agregados exitosamente');
    } catch (error) {
      console.error('❌ Error en migración:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo campos de perfil de usuario...');
    
    try {
      await queryInterface.removeColumn('users', 'full_name');
      await queryInterface.removeColumn('users', 'membership_type');
      await queryInterface.removeColumn('users', 'membership_expires');
      await queryInterface.removeColumn('users', 'purchase_history');
      
      console.log('✅ Campos de perfil de usuario removidos');
    } catch (error) {
      console.error('❌ Error revirtiendo migración:', error.message);
      throw error;
    }
  }
};