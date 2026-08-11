const sendResponse = (res, statusCode, success, message, data = null) => {
  const payload = {
    success,
    message,
  };

  if (data !== undefined && data !== null) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendResponse,
};
