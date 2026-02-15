const cloudinary = require('cloudinary').v2;

// Remove the debug check since we're handling it in app.js
// Just configure Cloudinary directly


if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log(' Cloudinary configured successfully');
} else {
  console.log(' Cloudinary not configured - missing environment variables');
}

module.exports = cloudinary;