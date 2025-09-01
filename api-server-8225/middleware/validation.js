const Joi = require('joi');

// User validation schema for creation
const userSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 100 characters',
      'any.required': 'Password is required'
    }),
  
  role: Joi.string()
    .valid('user', 'admin')
    .default('user')
    .messages({
      'any.only': 'Role must be either "user" or "admin"'
    })
});

// User validation schema for updates (all fields optional)
const userUpdateSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters'
    }),
  
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  firstName: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters'
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters'
    }),
  
  password: Joi.string()
    .min(6)
    .max(100)
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 100 characters'
    }),
  
  role: Joi.string()
    .valid('user', 'admin')
    .messages({
      'any.only': 'Role must be either "user" or "admin"'
    }),
  
  isActive: Joi.boolean()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
}).min(1); // At least one field must be provided for update

// Pagination validation schema
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    }),
  
  sortBy: Joi.string()
    .valid('id', 'username', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt')
    .default('id')
    .messages({
      'any.only': 'sortBy must be one of: id, username, email, firstName, lastName, role, isActive, createdAt, updatedAt'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .messages({
      'any.only': 'sortOrder must be either "asc" or "desc"'
    }),
  
  isActive: Joi.string()
    .valid('true', 'false')
    .messages({
      'any.only': 'isActive must be either "true" or "false"'
    }),
  
  role: Joi.string()
    .valid('user', 'admin')
    .messages({
      'any.only': 'Role must be either "user" or "admin"'
    }),
  
  search: Joi.string()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'Search term must be at least 1 character long',
      'string.max': 'Search term must not exceed 100 characters'
    })
});

// Middleware functions
const validateUser = (req, res, next) => {
  const { error, value } = userSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  req.body = value; // Use validated and sanitized data
  next();
};

const validateUserUpdate = (req, res, next) => {
  const { error, value } = userUpdateSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  req.body = value; // Use validated and sanitized data
  next();
};

const validatePagination = (req, res, next) => {
  const { error, value } = paginationSchema.validate(req.query, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  req.query = value; // Use validated and sanitized data
  next();
};

module.exports = {
  validateUser,
  validateUserUpdate,
  validatePagination
};