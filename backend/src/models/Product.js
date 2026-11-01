const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    hsnSac:      { type: String, required: true, trim: true },
    unit:        { type: String, required: true },
    unitPrice:   { type: Number, required: true, min: 0 },
    cgstRate:    { type: Number, default: 0 },
    sgstRate:    { type: Number, default: 0 },
    igstRate:    { type: Number, default: 0 },
    description: { type: String },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
