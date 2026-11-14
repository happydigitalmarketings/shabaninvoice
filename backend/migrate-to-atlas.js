/**
 * One-time migration utility: copies local MongoDB collections (users, customers,
 * products, invoices) and local uploaded PDFs (backend/uploads/invoices/*) into
 * your cloud MongoDB Atlas database (GridFS bucket: invoice_pdfs).
 *
 * Usage:
 *   node migrate-to-atlas.js "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/shaban_billing?retryWrites=true&w=majority"
 *   OR:
 *   $env:TARGET_MONGODB_URI="mongodb+srv://..."; node migrate-to-atlas.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient, GridFSBucket } = require('mongodb');

const SOURCE_URI = process.env.SOURCE_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shaban_billing';
const TARGET_URI = process.argv[2] || process.env.TARGET_MONGODB_URI;

if (!TARGET_URI) {
  console.error('❌ Please pass your MongoDB Atlas URI as an argument or set TARGET_MONGODB_URI.');
  console.error('   Example: node migrate-to-atlas.js "mongodb+srv://user:pass@cluster.mongodb.net/shaban_billing?retryWrites=true&w=majority"');
  process.exit(1);
}

const UPLOADS_DIR = path.join(__dirname, 'uploads', 'invoices');
const COLLECTIONS = ['users', 'customers', 'products', 'invoices'];

function resolveDbName(client, fallback = 'shaban_billing') {
  const name = client.db().databaseName;
  return !name || name === 'test' ? fallback : name;
}

async function uploadToGridFs(bucket, buffer, filename, metadata = {}) {
  const existing = await bucket.find({ filename }).limit(1).toArray();
  if (existing.length > 0) {
    return existing[0]._id;
  }
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, {
      metadata: { ...metadata, contentType: 'application/pdf' },
    });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(buffer);
  });
}

(async () => {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDbName = resolveDbName(sourceClient, 'shaban_billing');
    const targetDbName = resolveDbName(targetClient, sourceDbName);
    const sourceDb = sourceClient.db(sourceDbName);
    const targetDb = targetClient.db(targetDbName);
    const targetBucket = new GridFSBucket(targetDb, { bucketName: 'invoice_pdfs' });

    console.log(`✅ Connected! Syncing "${sourceDbName}" -> "${targetDbName}" on Atlas`);

    for (const colName of COLLECTIONS) {
      const docs = await sourceDb.collection(colName).find({}).toArray();
      if (docs.length === 0) {
        console.log(`ℹ️  ${colName}: 0 records (skipped)`);
        continue;
      }

      if (colName === 'invoices') {
        for (const inv of docs) {
          const att = inv.pdfAttachment;
          if (att && att.filename) {
            const localPath = path.join(UPLOADS_DIR, att.filename);
            if (fs.existsSync(localPath)) {
              const buffer = fs.readFileSync(localPath);
              att.gridFsId = await uploadToGridFs(targetBucket, buffer, att.filename, {
                invoiceNumber: inv.invoiceNumber,
              });
            }
            att.url = `/uploads/invoices/${att.filename}`;
            delete att.path;
          }
        }
      }

      const ops = docs.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));

      await targetDb.collection(colName).bulkWrite(ops, { ordered: false });
      console.log(`✅ ${colName}: synced ${docs.length} document(s)`);
    }

    console.log('🎉 Migration to cloud MongoDB completed cleanly!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sourceClient.close().catch(() => {});
    await targetClient.close().catch(() => {});
  }
})();
