const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://enquiry-node.vercel.app','https://nammaqa-enquiry.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware to trace all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Diagnostic route
app.patch('/api/test-patch', (req, res) => {
  console.log('Test patch received');
  res.status(200).json({ message: 'Patch connectivity confirmed', body: req.body });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Enquiry API Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version
  });
});

app.get('/api/debug', async (req, res) => {
  try {
    const { sequelize } = require('./models');

    // Test database connection
    await sequelize.authenticate();

    res.status(200).json({
      status: 'success',
      database: 'connected',
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      nodeEnv: process.env.NODE_ENV
    });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/packages', require('./routes/package.routes'));
app.use('/api/subjects', require('./routes/subject.routes'));
app.use('/api/instructors', require('./routes/instructor.routes'));
app.use('/api/batches', require('./routes/batch.routes'));
app.use('/api/assignments', require('./routes/assignment.routes'));
app.use('/api/assignment-responses', require('./routes/assignmentresponse.routes'));
app.use('/api/mock-interviews', require('./routes/mockInterview.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/enquiries', require('./routes/enquiry.routes'));
app.use('/api/enquiry-students', require('./routes/enquiryStudent.routes'));
app.use('/api/logs', require('./routes/log.routes'));
app.use('/api/billings', require('./routes/billing.routes'));
app.use('/api/materials', require('./routes/material.routes'));
app.use('/api/feedbacks', require('./routes/feedback.routes'));
app.use('/api/instructor-subjects', require('./routes/instructorsubject.routes'));
app.use('/api/student-batches', require('./routes/studentbatch.routes'));
app.use('/api/class-feed', require('./routes/classfeed.routes'));
app.use('/api/class-feedback', require('./routes/classFeedback.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/job-posts', require('./routes/jobPost.routes'));
app.use('/api/user-placement', require('./routes/userplacementdetails.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path
  });
});

module.exports = app; 