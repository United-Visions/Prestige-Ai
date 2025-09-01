// 404 Not Found middleware
const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      health: 'GET /health',
      documentation: 'GET /api/docs',
      users: {
        'GET /api/users': 'Get all users',
        'GET /api/users/:id': 'Get user by ID',
        'POST /api/users': 'Create new user',
        'PUT /api/users/:id': 'Update user',
        'PATCH /api/users/:id': 'Partially update user',
        'DELETE /api/users/:id': 'Delete user'
      }
    }
  });
};

module.exports = notFound;