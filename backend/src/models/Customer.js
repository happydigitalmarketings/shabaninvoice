const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    line1:     { type: String },
    line2:     { type: String },
    city:      { type: String },
    state:     { type: String },
    stateCode: { type: String },
    pincode:   { type: String },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    branch:          { type: String, trim: true },
    gstin:           { type: String, trim: true },
    phone:           { type: String, trim: true },
    email:           { type: String, trim: true },
    billingAddress:  { type: addressSchema },
    shippingAddress: { type: addressSchema },
    sameAsBilling:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
