const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    line1:     { type: String, required: true },
    line2:     { type: String },
    city:      { type: String, required: true },
    state:     { type: String, required: true },
    stateCode: { type: String, required: true },
    pincode:   { type: String, required: true },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    gstin:           { type: String, trim: true },
    phone:           { type: String, trim: true },
    email:           { type: String, trim: true },
    billingAddress:  { type: addressSchema, required: true },
    shippingAddress: { type: addressSchema },
    sameAsBilling:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
