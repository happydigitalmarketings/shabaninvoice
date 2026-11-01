const Customer = require('../models/Customer');

// GET /api/customers
const getAll = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? { $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
      : {};
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/customers/:id
const getById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/customers/:id/invoices
const getInvoices = async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const invoices = await Invoice.find({ customerId: req.params.id }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/customers
const create = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/customers/:id
const update = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/customers/:id
const remove = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getById, getInvoices, create, update, remove };
