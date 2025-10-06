const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const documentsDir = path.join(uploadsDir, 'documents');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}
if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Store documents in documents folder, images in images folder
        if (file.mimetype === 'application/pdf') {
            cb(null, documentsDir);
        } else {
            cb(null, imagesDir);
        }
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter for images and PDFs
const fileFilter = (req, file, cb) => {
    // Check file type - allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only image and PDF files are allowed!'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

// Single file upload middleware
const uploadSingle = upload.single('file');

// Multiple files upload middleware
const uploadMultiple = upload.array('files', 10); // Max 10 files

// Document upload middleware for doctor documents
const uploadDocument = upload.single('document');

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum 10 files allowed.'
            });
        }
    }
    
    if (err.message === 'Only image and PDF files are allowed!') {
        return res.status(400).json({
            success: false,
            message: 'Only image and PDF files are allowed!'
        });
    }
    
    next(err);
};

// Generate file URL
const generateFileUrl = (filename, isDocument = false) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const folder = isDocument ? 'documents' : 'images';
    return `${baseUrl}/uploads/${folder}/${filename}`;
};

// Delete file from filesystem
const deleteFile = (filename, isDocument = false) => {
    const folder = isDocument ? documentsDir : imagesDir;
    const filePath = path.join(folder, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
};

module.exports = {
    uploadSingle,
    uploadMultiple,
    uploadDocument,
    handleUploadError,
    generateFileUrl,
    deleteFile,
    imagesDir,
    documentsDir
};
