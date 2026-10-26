const express = require('express');
const cors = require('cors');
const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    return callback(null, origin || true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  credentials: true,
  optionsSuccessStatus: 204,
};


app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Vary', 'Origin');

  res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.header(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || corsOptions.allowedHeaders.join(',')
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));

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
    nodeVersion: process.version,
    databaseurl:process.env.DATABASE_URL
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

// Mount routes with both /api and /api/v1 prefixes
const routes = [
  ['auth', require('./routes/auth.routes')],
  ['mobile/auth', require('./routes/mobile/auth.routes')],
  ['users', require('./routes/user.routes')],
  ['packages', require('./routes/package.routes')],
  ['subjects', require('./routes/subject.routes')],
  ['instructors', require('./routes/instructor.routes')],
  ['batches', require('./routes/batch.routes')],
  ['assignments', require('./routes/assignment.routes')],
  ['assignment-responses', require('./routes/assignmentresponse.routes')],
  ['mock-interviews', require('./routes/mockInterview.routes')],
  ['reviews', require('./routes/review.routes')],
  ['enquiries', require('./routes/enquiry.routes')],
  ['enquiry-students', require('./routes/enquiryStudent.routes')],
  ['logs', require('./routes/log.routes')],
  ['billings', require('./routes/billing.routes')],
  ['materials', require('./routes/material.routes')],
  ['feedbacks', require('./routes/feedback.routes')],
  ['instructor-subjects', require('./routes/instructorsubject.routes')],
  ['student-batches', require('./routes/studentbatch.routes')],
  ['class-feed', require('./routes/classfeed.routes')],
  ['class-feedback', require('./routes/classFeedback.routes')],
  ['attendance', require('./routes/attendance.routes')],
  ['job-posts', require('./routes/jobPost.routes')],
  ['user-placement', require('./routes/userplacementdetails.routes')],
];

routes.forEach(([path, router]) => {
  app.use(`/api/${path}`, router);
  app.use(`/api/v1/${path}`, router);
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path
  });
});

module.exports = app;
