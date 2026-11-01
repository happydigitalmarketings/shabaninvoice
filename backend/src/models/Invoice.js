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

const sellerInfoSchema = new mongoose.Schema(
  {
    businessName: { type: String },
    address:      { type: addressSchema },
    mobile:       { type: String },
    email:        { type: String },
    gstin:        { type: String },
    state:        { type: String },
    stateCode:    { type: String },
  },
  { _id: false }
);

const invoiceItemSchema = new mongoose.Schema(
  {
    srNo:          { type: Number },
    productId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName:   { type: String, required: true },
    hsnSac:        { type: String },
    quantity:      { type: Number, required: true },
    unit:          { type: String },
    unitRate:      { type: Number, required: true },
    taxableAmount: { type: Number },
    cgstRate:      { type: Number, default: 0 },
    cgstAmount:    { type: Number, default: 0 },
    sgstRate:      { type: Number, default: 0 },
    sgstAmount:    { type: Number, default: 0 },
    igstRate:      { type: Number, default: 0 },
    igstAmount:    { type: Number, default: 0 },
    totalAmount:   { type: Number },
  },
  { _id: true }
);

const paymentRecordSchema = new mongoose.Schema(
  {
    date:      { type: String },
    amount:    { type: Number },
    method:    { type: String, enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'] },
    reference: { type: String },
    notes:     { type: String },
  },
  { _id: true }
);

const customerInfoSchema = new mongoose.Schema(
  {
    name:            { type: String },
    branch:          { type: String, trim: true },
    gstin:           { type: String },
    phone:           { type: String },
    email:           { type: String },
    billingAddress:  { type: addressSchema },
    shippingAddress: { type: addressSchema },
    state:           { type: String },
    stateCode:       { type: String },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber:       { type: String, required: true, unique: true },
    invoiceDate:         { type: String, required: true },
    branch:              { type: String, trim: true },
    dueDate:             { type: String },
    seller:              { type: sellerInfoSchema },
    customerId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customer:            { type: customerInfoSchema, required: true },
    paymentTerms:        { type: String, default: 'Credit' },
    reverseCharge:       { type: Boolean, default: false },
    eWayBillNumber:      { type: String },
    vehicleNumber:       { type: String },
    placeOfSupply:       { type: String },
    isInterState:        { type: Boolean, default: false },
    items:               [invoiceItemSchema],
    subTotal:            { type: Number, default: 0 },
    totalCgst:           { type: Number, default: 0 },
    totalSgst:           { type: Number, default: 0 },
    totalIgst:           { type: Number, default: 0 },
    totalTax:            { type: Number, default: 0 },
    grandTotal:          { type: Number, default: 0 },
    roundOff:            { type: Number, default: 0 },
    amountInWords:       { type: String },
    paymentStatus:       { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    payments:            [paymentRecordSchema],
    amountPaid:          { type: Number, default: 0 },
    balanceDue:          { type: Number, default: 0 },
    status:              { type: String, enum: ['draft', 'issued', 'cancelled'], default: 'draft' },
    cancelledAt:         { type: Date },
    cancellationReason:  { type: String },
    notes:               { type: String },
    pdfAttachment: {
      originalName: { type: String },
      filename:     { type: String },
      path:         { type: String },
      url:          { type: String },
      size:         { type: Number },
      uploadedAt:   { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
