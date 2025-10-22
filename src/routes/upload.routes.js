const express = require('express');
const router = express.Router();
const { uploadImage, uploadMultipleImages, deleteImage } = require('../utils/uploadUtils');

// Single image upload
router.post('/upload', async (req, res) => {
  try {
    const { image, folder } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'No image provided'
      });
    }

    const result = await uploadImage(image, folder);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message
    });
  }
});

// Multiple images upload
router.post('/upload-multiple', async (req, res) => {
  try {
    const { images, folder } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    const result = await uploadMultipleImages(images, folder);
    
    res.json({
      success: result.success,
      message: `Uploaded ${result.uploaded.length} images`,
      data: result
    });
    
  } catch (error) {
    console.error('Multiple upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during multiple upload',
      error: error.message
    });
  }
});

// Delete image
router.delete('/delete', async (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'No public ID provided'
      });
    }

    const result = await deleteImage(publicId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete image',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during deletion',
      error: error.message
    });
  }
});

module.exports = router;