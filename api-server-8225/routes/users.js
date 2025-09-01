const express = require('express');
const router = express.Router();

// Import controllers
const userController = require('../controllers/userController');

// Import validation middleware
const { validateUser, validateUserUpdate, validatePagination } = require('../middleware/validation');

// Import authentication middleware (optional - uncomment if needed)
// const auth = require('../middleware/auth');

// Routes

/**
 * GET /api/users
 * Get all users with pagination and filtering
 */
router.get('/', validatePagination, userController.getAllUsers);

/**
 * GET /api/users/stats
 * Get user statistics
 */
router.get('/stats', userController.getUserStats);

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', userController.getUserById);

/**
 * POST /api/users
 * Create new user
 */
router.post('/', validateUser, userController.createUser);

/**
 * PUT /api/users/:id
 * Update user (full update)
 */
router.put('/:id', validateUserUpdate, userController.updateUser);

/**
 * PATCH /api/users/:id
 * Partially update user
 */
router.patch('/:id', userController.patchUser);

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', userController.deleteUser);

/**
 * POST /api/users/:id/activate
 * Activate user account
 */
router.post('/:id/activate', userController.activateUser);

/**
 * POST /api/users/:id/deactivate
 * Deactivate user account
 */
router.post('/:id/deactivate', userController.deactivateUser);

/**
 * POST /api/users/search
 * Search users
 */
router.post('/search', userController.searchUsers);

module.exports = router;