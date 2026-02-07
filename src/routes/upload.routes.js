const express = require('express');
const router = express.Router();
const { 
  // Original methods
  uploadImage, 
  uploadMultipleImages, 
  deleteImage,
  
  // New multer-based methods
  uploadImageMulter,
  uploadMultipleImagesMulter,
  
  // Multer middleware
  uploadSingle,
  uploadMultiple,
  uploadFields,
  
  // Utility methods
  generateImageUrl,
  getImageInfo
} = require('../utils/uploadUtils');

// ===================== BASE64/DATA URI UPLOADS (EXISTING) =====================

// Single image upload (base64/data URI)
router.post('/upload', async (req, res) => {
  console.log("📥 Base64 upload request received");
  
  try {
    const { image, folder = 'hardware-shop' } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'No image provided'
      });
    }

    console.log(`Processing base64 image, length: ${image.length}`);
    
    const result = await uploadImage(image, folder);
    
    if (result.success) {
      console.log('✅ Base64 upload successful');
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: result
      });
    } else {
      console.error('❌ Base64 upload failed:', result.error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message
    });
  }
});

// Multiple images upload (base64/data URI)
router.post('/upload-multiple', async (req, res) => {
  console.log("📥 Multiple base64 upload request received");
  
  try {
    const { images, folder = 'hardware-shop' } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    console.log(`Processing ${images.length} base64 images`);
    
    const result = await uploadMultipleImages(images, folder);
    
    res.json({
      success: result.success,
      message: `Uploaded ${result.uploaded.length} of ${images.length} images`,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Multiple upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during multiple upload',
      error: error.message
    });
  }
});

// ===================== DIRECT FILE UPLOADS (NEW - MULTER) =====================

// Single image direct upload (file)
router.post('/upload-direct', uploadSingle, async (req, res) => {
  console.log("📥 Direct file upload request received");
  
  try {
    const { folder = 'hardware-shop' } = req.body;
    
    console.log(`Uploading to folder: ${folder}`);
    
    const result = await uploadImageMulter(req, folder);
    
    if (result.success) {
      console.log('✅ Direct upload successful:', result.public_id);
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: result
      });
    } else {
      console.error('❌ Direct upload failed:', result.error);
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to upload image',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Direct upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message
    });
  }
});

// Multiple images direct upload (files)
router.post('/upload-multiple-direct', uploadMultiple, async (req, res) => {
  console.log("📥 Multiple file upload request received");
  
  try {
    const { folder = 'hardware-shop' } = req.body;
    
    console.log(`Uploading ${req.files ? req.files.length : 0} files to folder: ${folder}`);
    
    const result = await uploadMultipleImagesMulter(req, folder);
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Successfully uploaded ${result.successCount} of ${result.total} images`
        : 'Failed to upload images',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Multiple file upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message
    });
  }
});

// Upload with multiple fields (e.g., main image + gallery)
router.post('/upload-fields', uploadFields, async (req, res) => {
  console.log("📥 Multiple fields upload request received");
  
  try {
    const { folder = 'hardware-shop' } = req.body;
    
    const uploadResults = {};
    
    // Process main image if present
    if (req.files.mainImage && req.files.mainImage.length > 0) {
      const mainImageReq = { file: req.files.mainImage[0] };
      uploadResults.mainImage = await uploadImageMulter(mainImageReq, folder);
    }
    
    // Process gallery images if present
    if (req.files.galleryImages && req.files.galleryImages.length > 0) {
      const galleryReq = { files: req.files.galleryImages };
      uploadResults.gallery = await uploadMultipleImagesMulter(galleryReq, folder);
    }
    
    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: uploadResults
    });
    
  } catch (error) {
    console.error('❌ Fields upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message
    });
  }
});

// ===================== IMAGE MANAGEMENT ROUTES =====================

// Delete image
router.delete('/delete', async (req, res) => {
  console.log("🗑️ Delete image request received");
  
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'No public ID provided'
      });
    }

    console.log(`Deleting image: ${publicId}`);
    
    const result = await deleteImage(publicId);
    
    if (result.success) {
      console.log('✅ Image deleted successfully');
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      console.error('❌ Delete failed:', result.error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete image',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Delete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during deletion',
      error: error.message
    });
  }
});

// Generate image URL with transformations
router.post('/generate-url', async (req, res) => {
  console.log("🔗 Generate URL request received");
  
  try {
    const { publicId, transformations = {} } = req.body;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'No public ID provided'
      });
    }

    console.log(`Generating URL for: ${publicId} with transformations:`, transformations);
    
    const url = generateImageUrl(publicId, transformations);
    
    if (url) {
      res.json({
        success: true,
        message: 'URL generated successfully',
        data: { url }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate URL'
      });
    }
    
  } catch (error) {
    console.error('❌ Generate URL route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during URL generation',
      error: error.message
    });
  }
});

// Get image information
router.get('/info/:publicId', async (req, res) => {
  console.log("ℹ️ Get image info request received");
  
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'No public ID provided'
      });
    }

    console.log(`Getting info for: ${publicId}`);
    
    const result = await getImageInfo(publicId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Image information retrieved',
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Get info route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving image information',
      error: error.message
    });
  }
});

// ===================== UTILITY ROUTES =====================

// Health check for upload service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Upload service is operational',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'POST /upload (base64)',
      'POST /upload-multiple (base64)',
      'POST /upload-direct (file)',
      'POST /upload-multiple-direct (files)',
      'POST /upload-fields (multiple fields)',
      'DELETE /delete',
      'POST /generate-url',
      'GET /info/:publicId'
    ]
  });
});

// Get upload limits
router.get('/limits', (req, res) => {
  res.json({
    success: true,
    data: {
      maxFileSize: '20MB',
      maxFiles: 10,
      allowedTypes: [
        'image/jpeg',
        'image/png', 
        'image/webp',
        'image/gif',
        'image/svg+xml'
      ],
      defaultFolder: 'hardware-shop'
    }
  });
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    // Multer-specific errors
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 20MB';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 10 files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }
    
    return res.status(400).json({
      success: false,
      message: message,
      error: error.code
    });
  }
  
  // Other errors
  console.error('❌ Upload route error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

module.exports = router;