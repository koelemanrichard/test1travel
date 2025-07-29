const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Auth rate limiting (more strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 auth requests per windowMs
});

// Mock database for demonstration
const mockAdmins = [
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@uniquestays.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123!@#
    role: 'admin',
    status: 'active',
    created_at: new Date().toISOString()
  }
];

const mockProperties = [
  {
    id: 1,
    name: "Treehouse Paradise",
    location: "Costa Rica",
    category: "Treehouse",
    price: 180,
    rating: 4.9,
    status: "Active",
    bookings: 24,
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    created_at: "2024-01-15"
  },
  {
    id: 2,
    name: "Castle in the Clouds",
    location: "Scotland",
    category: "Castle",
    price: 450,
    rating: 4.8,
    status: "Active",
    bookings: 18,
    image: "https://images.unsplash.com/photo-1520637736862-4d197d17c92a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    created_at: "2024-01-10"
  }
];

const mockUsers = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    status: "Active",
    joinDate: "2024-01-15",
    lastLogin: "2024-03-10",
    bookings: 5,
    totalSpent: 2450,
    location: "New York, USA"
  }
];

const mockBookings = [
  {
    id: "BK001",
    guestName: "Sarah Johnson",
    guestEmail: "sarah.johnson@email.com",
    propertyName: "Treehouse Paradise",
    propertyLocation: "Costa Rica",
    checkIn: "2024-04-15",
    checkOut: "2024-04-18",
    guests: 2,
    totalAmount: 540,
    status: "Confirmed",
    bookingDate: "2024-03-10",
    paymentStatus: "Paid"
  }
];

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find admin in mock database
    const admin = mockAdmins.find(a => a.id === decoded.adminId && a.status === 'active');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Admin login
app.post('/api/admin/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input data' });
    }

    const { email, password } = req.body;

    // Find admin user
    const admin = mockAdmins.find(a => a.email === email && a.status === 'active');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...adminData } = admin;

    res.json({
      token,
      admin: adminData,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify admin token
app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
  const { password: _, ...adminData } = req.admin;
  res.json(adminData);
});

// Get admin stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = {
      properties: { 
        total: mockProperties.length, 
        change: +12, 
        trend: 'up' 
      },
      users: { 
        total: mockUsers.length, 
        change: +156, 
        trend: 'up' 
      },
      bookings: { 
        total: mockBookings.length, 
        change: -23, 
        trend: 'down' 
      },
      revenue: { 
        total: 89750, 
        change: +8920, 
        trend: 'up' 
      },
      avgRating: { 
        total: 4.8, 
        change: +0.2, 
        trend: 'up' 
      },
      views: { 
        total: 15420, 
        change: +2340, 
        trend: 'up' 
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// Get all properties (admin)
app.get('/api/admin/properties', authenticateAdmin, async (req, res) => {
  try {
    res.json(mockProperties);
  } catch (error) {
    console.error('Properties fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
});

// Create property
app.post('/api/admin/properties', authenticateAdmin, [
  body('name').notEmpty().trim(),
  body('location').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('price').isNumeric(),
  body('description').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
    }

    const propertyData = {
      id: mockProperties.length + 1,
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'Active',
      rating: 0,
      bookings: 0
    };

    mockProperties.push(propertyData);
    res.status(201).json(propertyData);
  } catch (error) {
    console.error('Property creation error:', error);
    res.status(500).json({ message: 'Failed to create property' });
  }
});

// Update property
app.put('/api/admin/properties/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const propertyIndex = mockProperties.findIndex(p => p.id == id);
    
    if (propertyIndex === -1) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const updateData = {
      ...mockProperties[propertyIndex],
      ...req.body,
      updated_at: new Date().toISOString()
    };

    mockProperties[propertyIndex] = updateData;
    res.json(updateData);
  } catch (error) {
    console.error('Property update error:', error);
    res.status(500).json({ message: 'Failed to update property' });
  }
});

// Delete property
app.delete('/api/admin/properties/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const propertyIndex = mockProperties.findIndex(p => p.id == id);
    
    if (propertyIndex === -1) {
      return res.status(404).json({ message: 'Property not found' });
    }

    mockProperties.splice(propertyIndex, 1);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Property deletion error:', error);
    res.status(500).json({ message: 'Failed to delete property' });
  }
});

// Get all users (admin)
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    res.json(mockUsers);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all bookings (admin)
app.get('/api/admin/bookings', authenticateAdmin, async (req, res) => {
  try {
    res.json(mockBookings);
  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'UniqueStays Admin Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UniqueStays Admin Backend running on port ${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:5173/#/admin/login`);
  console.log(`🔑 Default Admin Credentials:`);
  console.log(`   Email: admin@uniquestays.com`);
  console.log(`   Password: admin123!@#`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;