const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/userModel');
const connectDB = require('../config/db');

dotenv.config();

// Connect to database
connectDB();

const createAdmin = async () => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@example.com' });

    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      fullName: process.env.ADMIN_NAME || 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'isAdmin'
    });

    if (admin) {
      console.log('Admin user created successfully:');
      console.log(`Name: ${admin.fullName}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Role: ${admin.role}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

createAdmin(); 