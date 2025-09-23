import mongoose from 'mongoose';

// Example User Schema
export interface IUser extends mongoose.Document {
  _id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  versionKey: false // Removes the __v field
});

// Example Post Schema (for blog/content apps)
export interface IPost extends mongoose.Document {
  _id: string;
  title: string;
  content: string;
  author: mongoose.Types.ObjectId | IUser;
  tags: string[];
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new mongoose.Schema<IPost>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  published: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Example Product Schema (for e-commerce apps)
export interface IProduct extends mongoose.Document {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inventory: number;
  images: string[];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new mongoose.Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  inventory: {
    type: Number,
    required: [true, 'Inventory count is required'],
    min: [0, 'Inventory cannot be negative'],
    default: 0
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  }],
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  versionKey: false
});

// Example Task Schema (for todo/task apps)
export interface ITask extends mongoose.Document {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  category?: string;
  user: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new mongoose.Schema<ITask>({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot be more than 50 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Create and export models
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

// Helper functions for common operations
export const createUser = async (userData: Partial<IUser>) => {
  const user = new User(userData);
  return await user.save();
};

export const findUserByEmail = async (email: string) => {
  return await User.findOne({ email: email.toLowerCase() });
};

export const createPost = async (postData: Partial<IPost>) => {
  const post = new Post(postData);
  return await post.save();
};

export const getPublishedPosts = async (limit = 10) => {
  return await Post.find({ published: true })
    .populate('author', 'name email')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

export const createProduct = async (productData: Partial<IProduct>) => {
  const product = new Product(productData);
  return await product.save();
};

export const getFeaturedProducts = async (limit = 8) => {
  return await Product.find({ featured: true, inventory: { $gt: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const createTask = async (taskData: Partial<ITask>) => {
  const task = new Task(taskData);
  return await task.save();
};

export const getUserTasks = async (userId: string, completed?: boolean) => {
  const filter: any = { user: userId };
  if (typeof completed === 'boolean') {
    filter.completed = completed;
  }
  return await Task.find(filter).sort({ createdAt: -1 });
};

// Export all schemas for reference
export const schemas = {
  UserSchema,
  PostSchema,
  ProductSchema,
  TaskSchema
};