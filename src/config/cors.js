const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://fsinterprises.vercel.app")
  .split(",")
  .map(o => o.trim());

console.log("🛡️ Allowed CORS Origins:", allowedOrigins);

const corsConfig = {
  allowedOrigins,
  
  middleware: (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      
      if (req.method === "OPTIONS") {
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, Origin, X-Requested-With, Accept"
        );
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS"
        );
        res.setHeader("Access-Control-Max-Age", "86400");
        console.log('🛬 Preflight OPTIONS request handled for:', origin);
        return res.status(200).send();
      }
    } else if (origin) {
      console.log('❌ CORS blocked origin:', origin);
    }

    next();
  },

  errorHandler: (err, req, res, next) => {
    if (err.message.includes('CORS policy')) {
      return res.status(403).json({
        success: false,
        message: "CORS policy violation: Origin not allowed",
        allowedOrigins: allowedOrigins,
        yourOrigin: req.headers.origin
      });
    }
    next(err);
  }
};

module.exports = corsConfig;