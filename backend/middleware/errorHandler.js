// middleware/errorHandler.js
module.exports = (err, req, res, _next) => {
  console.error('[ERR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
