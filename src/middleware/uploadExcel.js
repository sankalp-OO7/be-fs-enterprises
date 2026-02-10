
const multer = require('multer');

// Simple memory storage middleware
const uploadExcel = multer({
  storage: multer.memoryStorage(), // Key difference - no disk usage
  fileFilter: (req, file, cb) => {
    // Quick Excel file check
    const isExcel = 
      file.mimetype.includes('excel') || 
      file.mimetype.includes('sheet') || 
      file.originalname.match(/\.(xlsx|xls|csv)$/i);
    
    if (isExcel) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only Excel files (.xlsx, .xls, .csv)'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB - reasonable for Excel files
  }
}).single('excelFile'); // Field name expected in form-data

module.exports = uploadExcel;