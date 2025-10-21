const requestLogger = (req, res, next) => {
  console.log('🌐 Incoming Request:', {
    method: req.method,
    url: req.originalUrl,
    origin: req.headers.origin || 'no-origin',
    contentType: req.headers['content-type'],
    timestamp: new Date().toISOString()
  });
  next();
};

module.exports = requestLogger;