import type { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for allowed document types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and Word documents are allowed.'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 2 // Maximum 2 files (ID proof and work permit)
  }
});

// Handle document upload for driver registration
export const handleDriverDocumentUpload: RequestHandler = upload.fields([
  { name: 'id_proof', maxCount: 1 },
  { name: 'work_permit', maxCount: 1 }
]);

// Get uploaded file info
export const handleDriverDocumentUploadInfo: RequestHandler = (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files) {
      return res.status(400).json({ 
        error: 'No files uploaded' 
      });
    }

    const uploadedFiles: { [key: string]: string } = {};
    
    // Process uploaded files and return their URLs
    if (files.id_proof && files.id_proof[0]) {
      uploadedFiles.id_proof_url = `/uploads/documents/${files.id_proof[0].filename}`;
    }
    
    if (files.work_permit && files.work_permit[0]) {
      uploadedFiles.work_permit_url = `/uploads/documents/${files.work_permit[0].filename}`;
    }

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Upload failed' 
    });
  }
};

// Serve uploaded files
export const serveUploadedFile: RequestHandler = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', 'documents', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
};
