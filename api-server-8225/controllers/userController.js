const User = require('../models/User');

// Get all users with pagination and filtering
const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'asc',
      isActive,
      role,
      search
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Max 100 users per page
      sortBy,
      sortOrder,
      filter: {}
    };

    // Add filters
    if (isActive !== undefined) {
      options.filter.isActive = isActive === 'true';
    }
    if (role) {
      options.filter.role = role;
    }
    if (search) {
      options.filter.search = search;
    }

    const result = await User.findAll(options);

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
      message: `Retrieved ${result.users.length} users`
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Create new user
const createUser = async (req, res, next) => {
  try {
    const userData = req.body;

    const newUser = await User.create(userData);

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// Update user (full update)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }

    const updatedUser = await User.update(id, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// Partially update user
const patchUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }

    // Remove empty or undefined fields
    const cleanUpdateData = Object.keys(updateData).reduce((acc, key) => {
      if (updateData[key] !== undefined && updateData[key] !== '') {
        acc[key] = updateData[key];
      }
      return acc;
    }, {});

    if (Object.keys(cleanUpdateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    const updatedUser = await User.update(id, cleanUpdateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// Delete user
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }

    const deleted = await User.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Activate user
const activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }

    const updatedUser = await User.update(id, { isActive: true });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User activated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Deactivate user
const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }

    const updatedUser = await User.update(id, { isActive: false });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Search users
const searchUsers = async (req, res, next) => {
  try {
    const { query, filters = {}, pagination = {} } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const options = {
      page: pagination.page || 1,
      limit: Math.min(pagination.limit || 10, 100),
      sortBy: pagination.sortBy || 'id',
      sortOrder: pagination.sortOrder || 'asc',
      filter: {
        search: query.trim(),
        ...filters
      }
    };

    const result = await User.findAll(options);

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
      message: `Found ${result.users.length} users matching "${query}"`
    });
  } catch (error) {
    next(error);
  }
};

// Get user statistics
const getUserStats = async (req, res, next) => {
  try {
    const stats = await User.getStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: 'User statistics retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  patchUser,
  deleteUser,
  activateUser,
  deactivateUser,
  searchUsers,
  getUserStats
};