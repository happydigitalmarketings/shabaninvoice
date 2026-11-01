const Invoice = require('../models/Invoice');

const DEFAULT_SELLER = {
  businessName: 'SHABAN TRADITIONAL FOODS',
  address: {
    line1: '44,Sengottaiah Colony',
    line2: 'Saradha Mill Road, Sundarapuram',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    stateCode: '33',
    pincode: '641024',
  },
  mobile: '9585949146',
  email: 'shabantrendsofficial@gmail.com',
  gstin: '33BBFPA5813G1Z7',
  state: 'TamilNadu',
  stateCode: '33',
};

// Helper: next invoice number
const getNextInvoiceNumber = async () => {
  const last = await Invoice.findOne().sort({ createdAt: -1 }).select('invoiceNumber');
  if (!last) return 'STF001';
  const match = (last.invoiceNumber || '').match(/^([A-Za-z_-]*)(\d+)$/);
  if (match) {
    const prefix = match[1] || 'STF';
    const num = parseInt(match[2], 10);
    return `${prefix}${String(num + 1).padStart(Math.max(match[2].length, 3), '0')}`;
  }
  const num = parseInt((last.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
  return `STF${String(num + 1).padStart(3, '0')}`;
};

// GET /api/invoices/next-number
const nextNumber = async (req, res) => {
  try {
    const number = await getNextInvoiceNumber();
    res.json({ number });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invoices
const getAll = async (req, res) => {
  try {
    const { search, status, paymentStatus, from, to, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (from || to) {
      query.invoiceDate = {};
      if (from) query.invoiceDate.$gte = from;
      if (to)   query.invoiceDate.$lte = to;
    }
    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Invoice.countDocuments(query),
    ]);
    res.json({ invoices, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invoices/number/:num
const getByNumber = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceNumber: req.params.num });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invoices/:id
const getById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/invoices
const create = async (req, res) => {
  try {
    if (!req.body.invoiceNumber) {
      req.body.invoiceNumber = await getNextInvoiceNumber();
    }
    if (!req.body.seller || !req.body.seller.businessName) {
      req.body.seller = DEFAULT_SELLER;
    }
    const invoice = await Invoice.create(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/invoices/:id
const update = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/invoices/:id/issue
const issue = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'issued' },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/invoices/:id/cancel
const cancel = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancelledAt: new Date(), cancellationReason: req.body.reason },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/invoices/:id/payments
const addPayment = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    invoice.payments.push(req.body);
    invoice.amountPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    invoice.balanceDue = invoice.grandTotal - invoice.amountPaid;
    if (invoice.balanceDue <= 0) invoice.paymentStatus = 'paid';
    else if (invoice.amountPaid > 0) invoice.paymentStatus = 'partial';
    else invoice.paymentStatus = 'unpaid';

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/invoices/reports/summary
const reportSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = { status: { $ne: 'cancelled' } };
    if (from || to) {
      query.invoiceDate = {};
      if (from) query.invoiceDate.$gte = from;
      if (to)   query.invoiceDate.$lte = to;
    }
    const invoices = await Invoice.find(query);
    const totalRevenue    = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalPaid       = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const totalOutstanding = invoices.reduce((s, i) => s + i.balanceDue, 0);
    const totalInvoices   = invoices.length;
    const paidCount       = invoices.filter(i => i.paymentStatus === 'paid').length;
    const unpaidCount     = invoices.filter(i => i.paymentStatus === 'unpaid').length;
    const partialCount    = invoices.filter(i => i.paymentStatus === 'partial').length;

    res.json({ totalRevenue, totalPaid, totalOutstanding, totalInvoices, paidCount, unpaidCount, partialCount, invoices });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getById, getByNumber, create, update, issue, cancel, addPayment, nextNumber, reportSummary };
