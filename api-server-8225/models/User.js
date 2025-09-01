const bcrypt = require('bcryptjs');

// In-memory user storage (in production, use a database)
let users = [
  {
    id: 1,
    username: 'john_doe',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8fUZXg.6VmF7F9gHAaJjOzfGLfCEBm', // hashed 'password123'
    role: 'user',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  {
    id: 2,
    username: 'jane_smith',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    password: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8fUZXg.6VmF7F9gHAaJjOzfGLfCEBm', // hashed 'password123'
    role: 'admin',
    isActive: true,
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z')
  },
  {
    id: 3,
    username: 'bob_wilson',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Wilson',
    password: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8fUZXg.6VmF7F9gHAaJjOzfGLfCEBm', // hashed 'password123'
    role: 'user',
    isActive: false,
    createdAt: new Date('2024-01-03T00:00:00Z'),
    updatedAt: new Date('2024-01-03T00:00:00Z')
  }
];

let nextId = 4;

class User {
  // Get all users with optional filtering and pagination
  static async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'id', 
      sortOrder = 'asc',
      filter = {},
      includePassword = false 
    } = options;
    
    let filteredUsers = [...users];
    
    // Apply filters
    if (filter.isActive !== undefined) {
      filteredUsers = filteredUsers.filter(user => user.isActive === filter.isActive);
    }
    if (filter.role) {
      filteredUsers = filteredUsers.filter(user => user.role === filter.role);
    }
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.firstName.toLowerCase().includes(searchTerm) ||
        user.lastName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort users
    filteredUsers.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b[sortBy] > a[sortBy] ? 1 : -1;
      }
      return a[sortBy] > b[sortBy] ? 1 : -1;
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    // Remove password from response unless specifically requested
    const safeUsers = paginatedUsers.map(user => {
      if (!includePassword) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      return user;
    });
    
    return {
      users: safeUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limit),
        hasNext: endIndex < filteredUsers.length,
        hasPrev: page > 1
      }
    };
  }
  
  // Find user by ID
  static async findById(id, includePassword = false) {
    const user = users.find(user => user.id === parseInt(id));
    if (!user) return null;
    
    if (!includePassword) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return user;
  }
  
  // Find user by email
  static async findByEmail(email, includePassword = false) {
    const user = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    
    if (!includePassword) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return user;
  }
  
  // Find user by username
  static async findByUsername(username, includePassword = false) {
    const user = users.find(user => user.username.toLowerCase() === username.toLowerCase());
    if (!user) return null;
    
    if (!includePassword) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return user;
  }
  
  // Create new user
  static async create(userData) {
    const { username, email, firstName, lastName, password, role = 'user' } = userData;
    
    // Check if user already exists
    if (await this.findByEmail(email)) {
      throw new Error('User with this email already exists');
    }
    if (await this.findByUsername(username)) {
      throw new Error('User with this username already exists');
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const newUser = {
      id: nextId++,
      username,
      email,
      firstName,
      lastName,
      password: hashedPassword,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.push(newUser);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }
  
  // Update user
  static async update(id, updateData) {
    const userIndex = users.findIndex(user => user.id === parseInt(id));
    if (userIndex === -1) return null;
    
    const user = users[userIndex];
    const allowedUpdates = ['username', 'email', 'firstName', 'lastName', 'role', 'isActive'];
    
    // Check for email/username conflicts (if being updated)
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== parseInt(id)) {
        throw new Error('User with this email already exists');
      }
    }
    
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await this.findByUsername(updateData.username);
      if (existingUser && existingUser.id !== parseInt(id)) {
        throw new Error('User with this username already exists');
      }
    }
    
    // Update only allowed fields
    const updates = {};
    allowedUpdates.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        updates[field] = updateData[field];
      }
    });
    
    // Hash password if provided
    if (updateData.password) {
      const saltRounds = 10;
      updates.password = await bcrypt.hash(updateData.password, saltRounds);
    }
    
    // Update user
    users[userIndex] = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    
    // Return updated user without password
    const { password, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  }
  
  // Delete user
  static async delete(id) {
    const userIndex = users.findIndex(user => user.id === parseInt(id));
    if (userIndex === -1) return false;
    
    users.splice(userIndex, 1);
    return true;
  }
  
  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  
  // Get user statistics
  static async getStats() {
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;
    const adminUsers = users.filter(user => user.role === 'admin').length;
    const regularUsers = users.filter(user => user.role === 'user').length;
    
    return {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      admins: adminUsers,
      users: regularUsers,
      roles: {
        admin: adminUsers,
        user: regularUsers
      }
    };
  }
}

module.exports = User;