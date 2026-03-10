import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pixel Vault Backend API',
      version: '1.0.0',
      description: 'Image management API with user authentication and Cloudinary storage',
      contact: {
        name: 'Pixel Vault Team',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' ? process.env.API_URL || 'https://api.pixelvault.com' : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production API' : 'Development API',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token received from login endpoint',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Image: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            image_url: {
              type: 'string',
              format: 'uri',
            },
            keywords: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            width: {
              type: 'integer',
            },
            height: {
              type: 'integer',
            },
            size: {
              type: 'integer',
            },
            is_private: {
              type: 'boolean',
            },
            uploaded_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  apis: ['./src/index.js', './src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
