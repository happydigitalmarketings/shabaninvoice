const app = require('../backend/src/server');

/**
 * Vercel Serverless entry point wrapping the Express application.
 * Restores the original `/api/...` or `/uploads/...` path forwarded via `__vercel_path`
 * by vercel.json rewrites so Express routing and query strings match cleanly.
 */
module.exports = (req, res) => {
  try {
    const parsed = new URL(req.url, 'http://localhost');
    const targetPath = parsed.searchParams.get('__vercel_path');
    if (targetPath) {
      parsed.searchParams.delete('__vercel_path');
      const qs = parsed.searchParams.toString();
      const safePath = encodeURI(targetPath);
      req.url = qs ? `${safePath}?${qs}` : safePath;
    }
  } catch (err) {
    console.warn('Vercel URL normalization warning:', err.message);
  }

  return app(req, res);
};
