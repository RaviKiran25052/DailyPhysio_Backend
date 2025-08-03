const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Import routes
const userRoutes = require('./routes/userRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const adminRoutes = require('./routes/adminRoute');
const therapistRoutes = require('./routes/therapistRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const routineRoutes = require('./routes/routineRoutes');
const publicRoutes = require('./routes/publicRoutes');

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Routes
app.use('/hep2go/public', publicRoutes);
app.use('/hep2go/users', userRoutes);
app.use('/hep2go/exercises', exerciseRoutes);
app.use('/hep2go/therapist', therapistRoutes);
app.use('/hep2go/consultation', consultationRoutes);
app.use('/hep2go/admin', adminRoutes);
app.use('/hep2go/routines', routineRoutes);
// Static file serving for uploads
app.use('/hep2go/uploads', express.static(path.join(__dirname, 'uploads')));

// Base route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
); 