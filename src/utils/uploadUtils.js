const cloudinary = require('../config/cloudinary');

/**
 * Upload image to Cloudinary
 * @param {Buffer|String} file - File buffer or base64 string
 * @param {String} folder - Folder name in Cloudinary
 * @returns {Object} Upload result
 */
const uploadImage = async (file, folder = 'hardware-shop') => {
  try {
    console.log('📤 Uploading image to Cloudinary...');
    
    const options = {
      folder: folder,
      quality: 'auto',
      fetch_format: 'auto',
      resource_type: 'image'
    };

    // Upload the image
    const result = await cloudinary.uploader.upload(file, options);
    
    console.log('✅ Image uploaded successfully:', result.public_id);
    
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
    console.error('❌ Cloudinary upload error:', error);
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
    
    console.log(`📊 Uploaded ${successfulUploads.length}/${files.length} images`);
    
    if (failedUploads.length > 0) {
      console.error('❌ Failed uploads:', failedUploads);
    }
    
    return {
      success: true,
      uploaded: successfulUploads,
      failed: failedUploads
    };
    
  } catch (error) {
    console.error('❌ Multiple upload error:', error);
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
      console.log('✅ Image deleted:', publicId);
      return { success: true };
    } else {
      console.error('❌ Failed to delete image:', publicId);
      return { success: false, error: result.result };
    }
    
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage
};