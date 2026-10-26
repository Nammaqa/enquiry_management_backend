const jwt = require('jsonwebtoken');

exports.signToken = async (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

exports.verifyToken = async (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
