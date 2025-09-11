const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/users');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to API Server 8225',
    version: '1.0.0',
    description: 'RESTful API with user endpoints',
    endpoints: {
      health: '/health',
      users: '/api/users',
      documentation: '/api/docs'
    }
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    title: 'API Server 8225 Documentation',
    version: '1.0.0',
    endpoints: {
      users: {
        'GET /api/users': 'Get all users (with pagination)',
        'GET /api/users/:id': 'Get user by ID',
        'POST /api/users': 'Create new user',
        'PUT /api/users/:id': 'Update user by ID',
        'PATCH /api/users/:id': 'Partially update user by ID',
        'DELETE /api/users/:id': 'Delete user by ID'
      }
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    rateLimit: {
      requests: 100,
      window: '15 minutes'
    }
  });
});

// Routes
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server 8225 is running on port ${PORT}`);
  console.log(`📚 Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;