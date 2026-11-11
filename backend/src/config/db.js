require('dotenv').config();
const mongoose = require('mongoose');

let cached = global.__shabanMongooseCache;
if (!cached) {
  cached = global.__shabanMongooseCache = { conn: null, promise: null };
}

/**
 * Connect to MongoDB with connection caching for both persistent servers and serverless functions.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1 && cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri)
      .then((m) => {
        console.log(`✅ MongoDB Connected: ${m.connection.host}`);
        return m;
      })
      .catch((error) => {
        cached.promise = null;
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
