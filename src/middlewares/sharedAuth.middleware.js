const { verifyToken } = require('../config/jwt');

/**
 * Middleware to allow either regular Users or Enquiry Students.
 * It checks the Authorization header for a valid token and verifies if it
 * belongs to either a system User or an Enquiry Student.
 */
const sharedAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    if (payload.enquiryId) {
      // It's an Enquiry Student
      req.enquiry = payload;
      req.isEnquiryStudent = true;
    } else if (payload.role) {
      // It's a system User (Admin, Instructor, etc.)
      req.user = payload;
      req.isEnquiryStudent = false;
    } else {
      return res.status(401).json({ message: 'Invalid token: Unknown user type' });
    }

    next();
  } catch (error) {
    console.error('Shared auth error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = sharedAuth;
