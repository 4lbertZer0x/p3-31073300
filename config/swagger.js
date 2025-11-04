const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CineCríticas API',
      version: '1.0.0',
      description: 'API RESTful para sistema de reseñas de cine con autenticación JWT',
      contact: {
        name: 'API Support',
        email: 'support@cinecriticas.com'
      },
      license: {
        name: 'MIT',
        url: 'https://spdx.org/licenses/MIT.html'
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
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            username: {
              type: 'string',
              example: 'johndoe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
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
              example: 'Una obra maestra del cine moderno...'
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
            poster_url: {
              type: 'string',
              example: '/images/default-poster.jpg'
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
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Mensaje de error'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login exitoso'
            },
            token: {
              type: 'string',
              description: 'Token JWT'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
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
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./app.js'], // Ruta a tu archivo principal
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };