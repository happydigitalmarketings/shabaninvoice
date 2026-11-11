require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const connectDB = require('./config/db');
const { findPdfByFilename, openPdfDownloadStream } = require('./utils/gridfs');

const app = express();
app.set('trust proxy', 1);

// CORS configuration: allow comma-separated CORS_ORIGIN or '*' when unset
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      : '*',
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure MongoDB connection is active (important for serverless / auto-reconnects)
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: `Database connection error: ${err.message}` });
  }
});

// Serve uploaded invoice PDFs from local disk first, then MongoDB GridFS
app.get('/uploads/invoices/:filename', async (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  try {
    const safeName = path.basename(req.params.filename || '');
    if (!safeName) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    const diskPath = path.join(__dirname, '../uploads/invoices', safeName);
    if (fs.existsSync(diskPath)) {
      return res.sendFile(diskPath);
    }

    const fileDoc = await findPdfByFilename(safeName);
    if (!fileDoc) {
      return res.status(404).json({ message: 'Uploaded PDF not found' });
    }

    res.setHeader('Content-Type', fileDoc.metadata?.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    const downloadStream = await openPdfDownloadStream(fileDoc);
    downloadStream.on('error', next);
    return downloadStream.pipe(res);
  } catch (err) {
    return next(err);
  }
});

// Fallback static handler for any other local files under uploads/
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/products',  require('./routes/product.routes'));
app.use('/api/invoices',  require('./routes/invoice.routes'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// Optional single-service mode: serve built React frontend from Express when SERVE_FRONTEND=true
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (process.env.SERVE_FRONTEND === 'true' && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 handler for unmatched API / upload routes
app.use((req, res) => res.status(404).json({ message: `Route ${req.url} not found` }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack || err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('❌ Failed to start server:', err.message);
      process.exit(1);
    });
}

module.exports = app;
