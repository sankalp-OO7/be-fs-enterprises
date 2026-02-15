const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const streamifier = require('streamifier');

// ===================== MULTER CONFIGURATION =====================

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
    }
  }
});

// ===================== HELPER FUNCTIONS =====================

/**
 * Convert buffer to Cloudinary upload stream
 */
const bufferToCloudinary = (buffer, folder = 'hardware-shop') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        quality: 'auto:good',
        fetch_format: 'auto',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Process base64/image string for Cloudinary
 */
const processImageSource = (file) => {
  if (typeof file === 'string') {
    // Check if it's already a data URI
    if (file.startsWith('data:')) {
      return file;
    } else {
      // It's a base64 string without prefix
      // Detect image type from base64
      if (file.startsWith('/9j/') || file.startsWith('/9j/')) {
        return `data:image/jpeg;base64,${file}`;
      } else if (file.startsWith('iVBORw0KGgo')) {
        return `data:image/png;base64,${file}`;
      } else if (file.startsWith('R0lGOD')) {
        return `data:image/gif;base64,${file}`;
      } else if (file.startsWith('UklGR')) {
        return `data:image/webp;base64,${file}`;
      } else {
        // Default to JPEG
        return `data:image/jpeg;base64,${file}`;
      }
    }
  }
  return file;
};

// ===================== EXISTING METHODS (UPDATED) =====================

/**
 * Upload image to Cloudinary
 * @param {Buffer|String} file - File buffer, base64 string, or data URI
 * @param {String} folder - Folder name in Cloudinary
 * @returns {Object} Upload result
 */
const uploadImage = async (file, folder = 'hardware-shop') => {
  try {
    
    const options = {
      folder: folder,
      quality: 'auto:good',
      fetch_format: 'auto',
      resource_type: 'image'
    };

    // Process the image source
    const processedSource = processImageSource(file);
    
    // Upload the image
    const result = await cloudinary.uploader.upload(processedSource, options);
    
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height
    };
    
  } catch (error) {
    console.error(' Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Upload multiple images
 * @param {Array} files - Array of file buffers or base64 strings
 * @param {String} folder - Folder name
 * @returns {Array} Array of upload results
 */
const uploadMultipleImages = async (files, folder = 'hardware-shop') => {
  try {
    const uploadPromises = files.map(file => uploadImage(file, folder));
    const results = await Promise.all(uploadPromises);
    
    const successfulUploads = results.filter(result => result.success);
    const failedUploads = results.filter(result => !result.success);
    
    
    if (failedUploads.length > 0) {
      console.error(' Failed uploads:', failedUploads);
    }
    
    return {
      success: successfulUploads.length > 0,
      uploaded: successfulUploads,
      failed: failedUploads,
      total: files.length,
      successCount: successfulUploads.length,
      failCount: failedUploads.length
    };
    
  } catch (error) {
    console.error(' Multiple upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Public ID of the image
 * @returns {Object} Delete result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      return { 
        success: true,
        message: 'Image deleted successfully'
      };
    } else {
      console.error(' Failed to delete image:', publicId);
      return { 
        success: false, 
        error: result.result,
        message: 'Failed to delete image'
      };
    }
    
  } catch (error) {
    console.error(' Cloudinary delete error:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Server error during deletion'
    };
  }
};

// ===================== NEW MULTER-BASED METHODS =====================

/**
 * Upload single image using multer (for direct file uploads)
 * @param {Object} req - Express request object with multer file
 * @param {String} folder - Folder name
 * @returns {Object} Upload result
 */
const uploadImageMulter = async (req, folder = 'hardware-shop') => {
  try {
    
    if (!req.file) {
      return {
        success: false,
        error: 'No file provided',
        message: 'Please select an image file'
      };
    }

    
    // Upload buffer to Cloudinary
    const result = await bufferToCloudinary(req.file.buffer, folder);
    
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype
    };
    
  } catch (error) {
    console.error(' Multer upload error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to upload image'
    };
  }
};

/**
 * Upload multiple images using multer
 * @param {Object} req - Express request object with multer files
 * @param {String} folder - Folder name
 * @returns {Object} Upload results
 */
const uploadMultipleImagesMulter = async (req, folder = 'hardware-shop') => {
  try {
    
    if (!req.files || req.files.length === 0) {
      return {
        success: false,
        error: 'No files provided',
        message: 'Please select image files'
      };
    }

    
    // Upload all files
    const uploadPromises = req.files.map(file => 
      bufferToCloudinary(file.buffer, folder)
        .then(result => ({
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }))
        .catch(error => ({
          success: false,
          originalName: file.originalname,
          error: error.message
        }))
    );

    const results = await Promise.all(uploadPromises);
    
    const successfulUploads = results.filter(result => result.success);
    const failedUploads = results.filter(result => !result.success);
    
    
    return {
      success: successfulUploads.length > 0,
      uploaded: successfulUploads,
      failed: failedUploads,
      total: req.files.length,
      successCount: successfulUploads.length,
      failCount: failedUploads.length
    };
    
  } catch (error) {
    console.error(' Multiple multer upload error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to upload images'
    };
  }
};

/**
 * Generate secure URL for image with transformations
 * @param {String} publicId - Public ID of the image
 * @param {Object} transformations - Cloudinary transformations
 * @returns {String} Secure URL
 */
const generateImageUrl = (publicId, transformations = {}) => {
  try {
    const url = cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });
    return url;
  } catch (error) {
    console.error(' URL generation error:', error);
    return null;
  }
};

/**
 * Get image information from Cloudinary
 * @param {String} publicId - Public ID of the image
 * @returns {Object} Image information
 */
const getImageInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error(' Get image info error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ===================== EXPORTS =====================

module.exports = {
  // Original methods
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  
  // New multer-based methods
  uploadImageMulter,
  uploadMultipleImagesMulter,
  
  // Helper methods
  generateImageUrl,
  getImageInfo,
  
  // Multer middleware for use in routes
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 10), // Max 10 files
  uploadFields: upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 9 }
  ]),
  
  // Raw multer instance for custom configurations
  multerUpload: upload,
  
  // Process image source helper (optional export)
  processImageSource
};