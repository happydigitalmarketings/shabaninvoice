const mongoose = require('mongoose');
const connectDB = require('../config/db');

const BUCKET_NAME = 'invoice_pdfs';

const getBucket = async () => {
  await connectDB();
  if (!mongoose.connection.db) {
    throw new Error('MongoDB database handle is not ready');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME,
  });
};

/**
 * Upload a PDF Buffer into MongoDB GridFS so uploads persist across cloud restarts/redeploys.
 */
const uploadPdfBuffer = async ({ buffer, filename, metadata = {} }) => {
  const bucket = await getBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        contentType: 'application/pdf',
      },
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        gridFsId: uploadStream.id,
        filename,
      });
    });

    uploadStream.end(buffer);
  });
};

/**
 * Locate the newest GridFS file matching a stored filename.
 */
const findPdfByFilename = async (filename) => {
  if (!filename) return null;
  const bucket = await getBucket();
  const files = await bucket
    .find({ filename })
    .sort({ uploadDate: -1 })
    .limit(1)
    .toArray();
  return files[0] || null;
};

/**
 * Open a readable GridFS download stream for an existing GridFS file document.
 */
const openPdfDownloadStream = async (fileDoc) => {
  const bucket = await getBucket();
  return bucket.openDownloadStream(fileDoc._id);
};

/**
 * Delete a stored PDF from GridFS by gridFsId and/or filename. Ignores missing files.
 */
const deletePdfFromGridFs = async ({ gridFsId, filename } = {}) => {
  try {
    const bucket = await getBucket();
    if (gridFsId) {
      const objectId =
        gridFsId instanceof mongoose.Types.ObjectId
          ? gridFsId
          : new mongoose.Types.ObjectId(String(gridFsId));
      await bucket.delete(objectId).catch(() => {});
      return;
    }
    if (filename) {
      const files = await bucket.find({ filename }).toArray();
      await Promise.all(files.map((f) => bucket.delete(f._id).catch(() => {})));
    }
  } catch (err) {
    console.warn('GridFS delete warning:', err.message);
  }
};

module.exports = {
  uploadPdfBuffer,
  findPdfByFilename,
  openPdfDownloadStream,
  deletePdfFromGridFs,
};

