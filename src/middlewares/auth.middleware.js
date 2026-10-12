const { verifyToken } = require('../config/jwt');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-access-token'] || req.headers.token;
    if (!authHeader) return res.status(401).json({ message: 'No token' });

    let token = authHeader;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (typeof authHeader === 'string') {
      token = authHeader.trim();
    }

    if (!token) return res.status(401).json({ message: 'No token' });

    const payload = await verifyToken(token);
    req.user = payload;

    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
