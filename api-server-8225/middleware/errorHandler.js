// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // Default error response
  let error = {
    success: false,
    message: 'Internal Server Error',
    statusCode: 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.message = 'Validation Error';
    error.statusCode = 400;
    error.details = err.details || err.message;
  }

  if (err.name === 'CastError') {
    error.message = 'Invalid resource ID';
    error.statusCode = 400;
  }

  if (err.code === 11000) {
    error.message = 'Duplicate field value';
    error.statusCode = 409;
  }

  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = 401;
  }

  // Handle custom error messages
  if (err.message) {
    error.message = err.message;
  }

  // Handle custom status codes
  if (err.statusCode) {
    error.statusCode = err.statusCode;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  res.status(error.statusCode).json(error);
};

module.exports = errorHandler;