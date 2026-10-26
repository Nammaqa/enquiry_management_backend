const { verifyToken } = require('../config/jwt');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-access-token'] || req.headers.token;
    if (!authHeader) {
      return next();
    }

    let token = authHeader;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (typeof authHeader === 'string') {
      token = authHeader.trim();
    }

    if (!token) {
      return next();
    }

    try {
      const payload = await verifyToken(token);
      req.user = payload;
    } catch (err) {
      // Continue without user payload if token is invalid
    }

    next();
  } catch (err) {
    next();
  }
};
