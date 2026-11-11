const multer = require('multer');

// Memory storage keeps uploads independent of ephemeral/read-only container disks;
// PDFs are persisted into MongoDB GridFS by the invoice controller.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (
    file.mimetype === 'application/pdf' ||
    (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'))
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const uploadInvoicePdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

module.exports = { uploadInvoicePdf };
