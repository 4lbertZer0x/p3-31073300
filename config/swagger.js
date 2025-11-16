// config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CineCríticas API',
      version: '1.0.0',
      description: 'API REST para sistema de reseñas de cine con autenticación JWT',
      contact: {
        name: 'Soporte CineCríticas',
        email: 'soporte@cinecriticas.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            environment: {
              type: 'string',
              example: 'development'
            },
            version: {
              type: 'string',
              example: '1.0.0'
            },
            database: {
              type: 'string',
              example: 'connected'
            },
            auth: {
              type: 'string',
              example: 'JWT + Sessions Hybrid'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            username: {
              type: 'string',
              example: 'usuario123'
            },
            email: {
              type: 'string',
              example: 'usuario@ejemplo.com'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              example: 'user'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            title: {
              type: 'string',
              example: 'Excelente película'
            },
            content: {
              type: 'string',
              example: 'Una película fantástica con gran actuación...'
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              example: 5
            },
            movie_title: {
              type: 'string',
              example: 'Inception'
            },
            user_id: {
              type: 'integer',
              example: 1
            },
            is_featured: {
              type: 'boolean',
              example: false
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Endpoints de verificación de salud del servidor'
      },
      {
        name: 'Authentication',
        description: 'Endpoints de autenticación y gestión de usuarios'
      },
      {
        name: 'Users',
        description: 'Endpoints de gestión de usuarios'
      },
      {
        name: 'Reviews',
        description: 'Endpoints de gestión de reseñas'
      },
      {
        name: 'Admin',
        description: 'Endpoints de administración (requieren rol admin)'
      },
      {
        name: 'Pages',
        description: 'Páginas web renderizadas'
      },
      {
        name: 'Test',
        description: 'Endpoints de prueba'
      }
    ]
  },
  apis: [
    './app.js',
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};