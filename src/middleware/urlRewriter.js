const urlRewriter = (req, res, next) => {
  const originalUrl = req.originalUrl;
  const stage = process.env.SERVERLESS_STAGE || 'dev';
  
  if (originalUrl.startsWith(`/${stage}/`)) {
    req.url = originalUrl.replace(`/${stage}`, '');
  }
  next();
};

module.exports = urlRewriter;