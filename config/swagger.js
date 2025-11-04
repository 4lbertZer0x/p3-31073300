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
      },
      {
        url: 'https://tu-dominio.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'email', 'role'],
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            username: {
              type: 'string',
              example: 'johndoe',
              minLength: 3,
              maxLength: 30
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
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Review: {
          type: 'object',
          required: ['title', 'content', 'rating', 'movie_title', 'user_id'],
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            title: {
              type: 'string',
              example: 'Excelente película',
              minLength: 1,
              maxLength: 255
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
              example: 'Inception',
              minLength: 1,
              maxLength: 255
            },
            poster_url: {
              type: 'string',
              example: '/images/default-poster.jpg'
            },
            user_id: {
              type: 'integer',
              example: 1
            },
            username: {
              type: 'string',
              example: 'johndoe'
            },
            is_featured: {
              type: 'boolean',
              example: false
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Movie: {
          type: 'object',
          required: ['title', 'year', 'genre', 'type'],
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            title: {
              type: 'string',
              example: 'Inception'
            },
            year: {
              type: 'string',
              example: '2010'
            },
            genre: {
              type: 'string',
              example: 'Sci-Fi, Action'
            },
            description: {
              type: 'string',
              example: 'Un ladrón que roba secretos...'
            },
            type: {
              type: 'string',
              enum: ['movie', 'series'],
              example: 'movie'
            },
            poster_url: {
              type: 'string',
              example: '/images/default-poster.jpg'
            },
            is_active: {
              type: 'boolean',
              example: true
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
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Mensaje de error descriptivo'
            },
            details: {
              type: 'string',
              example: 'Detalles adicionales del error'
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
              description: 'Token JWT para autenticación API'
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
            },
            version: {
              type: 'string',
              example: '1.0.0'
            },
            database: {
              type: 'string',
              example: 'connected'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operación completada exitosamente'
            },
            data: {
              type: 'object',
              description: 'Datos adicionales de la respuesta'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Acceso no autorizado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Acceso denegado. Token requerido.'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Acceso prohibido - Se requieren permisos de administrador',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Se requieren permisos de administrador'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Recurso no encontrado'
              }
            }
          }
        },
        ValidationError: {
          description: 'Error de validación',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Error de validación',
                details: 'Todos los campos son requeridos'
              }
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
  apis: [
    './app.js',
    './routes/*.js',
    './controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };