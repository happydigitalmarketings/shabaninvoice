const Invoice  = require('../models/Invoice');
const Customer = require('../models/Customer');
const fs       = require('fs');
const path     = require('path');
const zlib     = require('zlib');

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

// Helper: next invoice number based on highest existing invoice number
const getNextInvoiceNumber = async () => {
  const invoices = await Invoice.find().select('invoiceNumber');
  if (!invoices || invoices.length === 0) return 'STF001';

  let maxNum = 0;
  let preferredPrefix = 'STF';
  let padLength = 3;

  for (const inv of invoices) {
    const raw = (inv.invoiceNumber || '').trim();
    const match = raw.match(/^([A-Za-z_-]*)(\d+)$/);
    if (match) {
      const prefix = match[1] || 'STF';
      const num = parseInt(match[2], 10);
      if (prefix.toUpperCase() === 'STF') {
        preferredPrefix = prefix;
        if (num > maxNum) {
          maxNum = num;
          padLength = Math.max(match[2].length, 3);
        }
      } else if (num > maxNum && maxNum === 0) {
        preferredPrefix = prefix;
        maxNum = num;
        padLength = Math.max(match[2].length, 3);
      }
    } else {
      const numOnly = parseInt(raw.replace(/\D/g, ''), 10);
      if (!isNaN(numOnly) && numOnly > maxNum) {
        maxNum = numOnly;
      }
    }
  }

  const nextVal = maxNum + 1;
  return `${preferredPrefix}${String(nextVal).padStart(padLength, '0')}`;
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

const extractPdfInvoiceData = (buffer) => {
  try {
    const content = buffer.toString('latin1');
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    let allStrings = [];

    while ((match = streamRegex.exec(content)) !== null) {
      let streamText = '';
      try {
        streamText = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      } catch (e) {
        streamText = match[1];
      }

      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(streamText)) !== null) {
        allStrings.push(tjMatch[1]);
      }

      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjaMatch;
      while ((tjaMatch = tjArrayRegex.exec(streamText)) !== null) {
        const innerRegex = /\(([^)]+)\)/g;
        let inMatch;
        while ((inMatch = innerRegex.exec(tjaMatch[1])) !== null) {
          allStrings.push(inMatch[1]);
        }
      }
    }

    const raw = allStrings.join('');
    const invMatch = raw.match(/Invoice\s*Number:\s*([A-Za-z0-9_-]+)/i);
    const dateMatch = raw.match(/Invoice\s*Date:\s*([0-9]{2}-[0-9]{2}-[0-9]{4})/i);
    const custMatch = raw.match(/Name:\s*([^\r\n]+?)(?:Address:|GSTIN:)/i);
    const amountMatch = raw.match(/Final\s*Invoice\s*Amount[^\d]*([\d,]+\.?\d*)/i);
    const gstinMatch = raw.match(/GSTIN:\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);

    let parsedDate = null;
    if (dateMatch && dateMatch[1]) {
      const parts = dateMatch[1].split('-');
      if (parts.length === 3) {
        parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let parsedAmount = null;
    if (amountMatch && amountMatch[1]) {
      parsedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    const addrMatch = raw.match(/Address:\s*([^\r\n]+?)(?:GSTIN:|State Code:)/i);
    const termsMatch = raw.match(/Payment\s*Terms:\s*([A-Za-z0-9\s]+?)(?:State|Due|E-Way|$)/i);
    let detectedBranch = null;
    let detectedAddress = addrMatch ? addrMatch[1].trim() : '';

    if (detectedAddress) {
      if (/podanur/i.test(detectedAddress)) detectedBranch = 'Podanur';
      else if (/kuniyamuthur/i.test(detectedAddress)) detectedBranch = 'Kuniyamuthur';
      else if (/sundarapuram/i.test(detectedAddress)) detectedBranch = 'Sundarapuram';
      else if (/karumbukkadai|saramedu/i.test(detectedAddress)) detectedBranch = 'Karumbukkadai';
      else if (/uppilipalayam/i.test(detectedAddress)) detectedBranch = 'Uppilipalayam';
      else if (/mettupalayam/i.test(detectedAddress)) detectedBranch = 'Mettupalayam';
      else if (detectedAddress.length <= 25 && !/address as per invoice/i.test(detectedAddress)) detectedBranch = detectedAddress;
    }

    // Specific invoice number fallbacks
    const invNum = invMatch ? invMatch[1].trim() : null;
    if (!detectedBranch && invNum) {
      if (invNum === 'STF005') detectedBranch = 'Podanur';
      else if (invNum === 'STF006') detectedBranch = 'Kuniyamuthur';
      else if (invNum === 'STF001' || invNum === 'STF011') detectedBranch = 'Sundarapuram';
      else if (invNum === 'STF004') detectedBranch = 'Uppilipalayam';
      else if (invNum === 'STF007' || invNum === 'STF008') detectedBranch = 'Karumbukkadai';
    }

    return {
      invoiceNumber: invNum,
      invoiceDate: parsedDate,
      customerName: custMatch ? custMatch[1].trim() : null,
      customerGstin: gstinMatch ? gstinMatch[1].trim() : null,
      customerAddress: detectedAddress,
      branch: detectedBranch,
      paymentTerms: termsMatch ? termsMatch[1].trim() : 'Credit',
      grandTotal: parsedAmount,
    };
  } catch (err) {
    console.error('PDF text extraction error:', err);
    return {};
  }
};

let stfMigrated = false;
const checkAndMigrateUploadedStf011 = async () => {
  if (stfMigrated) return;
  try {
    const host = process.env.HOST || 'localhost:5000';

    // 1. Migrate STF011
    const existingStf011 = await Invoice.findOne({ invoiceNumber: 'STF011' });
    const targetFile011 = 'invoice-6ae6b6c8e35113a8cfadd828-1793524175884.pdf';
    const filePath011 = path.join(__dirname, '../../uploads/invoices', targetFile011);

    if (!existingStf011 && fs.existsSync(filePath011)) {
      const stats = fs.statSync(filePath011);
      const fileUrl = `http://${host}/uploads/invoices/${targetFile011}`;

      let customerDoc = await Customer.findOne({ name: /Vikas Super Market/i });
      if (!customerDoc) {
        try {
          customerDoc = await Customer.create({
            name: 'Vikas Super Market',
            gstin: '33CLRPV0371F1ZV',
            phone: '',
            billingAddress: {
              line1: '1/56, Muddakarai Road, Sundarapuram',
              city: 'Coimbatore',
              state: 'Tamil Nadu',
              stateCode: '33',
              pincode: '641024',
            },
          });
        } catch (e) {
          console.warn('Customer auto-creation warning:', e.message);
        }
      }

      await Invoice.create({
        invoiceNumber: 'STF011',
        invoiceDate: '2026-10-27',
        paymentTerms: 'Credit',
        seller: DEFAULT_SELLER,
        customerId: customerDoc?._id,
        customer: {
          name: 'Vikas Super Market',
          gstin: '33CLRPV0371F1ZV',
          phone: '',
          state: 'Tamil Nadu',
          stateCode: '33',
          billingAddress: {
            line1: '1/56, Muddakarai Road, Sundarapuram',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            stateCode: '33',
            pincode: '641024',
          },
        },
        items: [
          { srNo: 1, productName: 'Multi Millet Noodles', hsnSac: '19023010', quantity: 6, unit: 'PCS', unitRate: 76, taxableAmount: 456, cgstRate: 2.5, cgstAmount: 11.4, sgstRate: 2.5, sgstAmount: 11.4, totalAmount: 478.8 },
          { srNo: 2, productName: 'Black Rice Noodles', hsnSac: '19023010', quantity: 6, unit: 'PCS', unitRate: 76, taxableAmount: 456, cgstRate: 2.5, cgstAmount: 11.4, sgstRate: 2.5, sgstAmount: 11.4, totalAmount: 478.8 },
          { srNo: 3, productName: 'Red Rice Noodles', hsnSac: '19023010', quantity: 6, unit: 'PCS', unitRate: 76, taxableAmount: 456, cgstRate: 2.5, cgstAmount: 11.4, sgstRate: 2.5, sgstAmount: 11.4, totalAmount: 478.8 },
        ],
        subTotal: 1368,
        totalCgst: 34.2,
        totalSgst: 34.2,
        totalTax: 68.4,
        grandTotal: 1436.4,
        amountPaid: 0,
        balanceDue: 1436.4,
        paymentStatus: 'unpaid',
        status: 'issued',
        pdfAttachment: {
          originalName: 'STF011.pdf',
          filename: targetFile011,
          path: filePath011,
          url: fileUrl,
          size: stats.size,
          uploadedAt: stats.mtime,
        },
      });
    }

    // 2. Migrate STF004 (Jai Enterprises)
    const existingStf004 = await Invoice.findOne({ invoiceNumber: 'STF004' });
    const targetFile004 = 'invoice-6ae6b6c8e35113a8cfadd828-1793525387431.pdf';
    const filePath004 = path.join(__dirname, '../../uploads/invoices', targetFile004);

    if (!existingStf004 && fs.existsSync(filePath004)) {
      const stats004 = fs.statSync(filePath004);
      const fileUrl004 = `http://${host}/uploads/invoices/${targetFile004}`;

      let custJai = await Customer.findOne({ name: /Jai Enterprises/i });
      if (!custJai) {
        try {
          custJai = await Customer.create({
            name: 'Jai Enterprises',
            gstin: '33AZZPJ4582G1ZU',
            phone: '9578771430',
            billingAddress: {
              line1: '480, Kamarajar Road, Uppilipalayam (PO)',
              city: 'Coimbatore',
              state: 'Tamil Nadu',
              stateCode: '33',
              pincode: '641015',
            },
          });
        } catch {}
      }

      await Invoice.create({
        invoiceNumber: 'STF004',
        invoiceDate: '2026-10-05',
        paymentTerms: 'Credit',
        seller: DEFAULT_SELLER,
        customerId: custJai?._id,
        customer: {
          name: 'Jai Enterprises',
          gstin: '33AZZPJ4582G1ZU',
          phone: '9578771430',
          state: 'Tamil Nadu',
          stateCode: '33',
          billingAddress: {
            line1: '480, Kamarajar Road, Uppilipalayam (PO)',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            stateCode: '33',
            pincode: '641015',
          },
        },
        items: [
          { srNo: 1, productName: 'Moringa Noodles', hsnSac: '19023010', quantity: 3, unit: 'PCS', unitRate: 76, taxableAmount: 228, cgstRate: 2.5, cgstAmount: 5.7, sgstRate: 2.5, sgstAmount: 5.7, totalAmount: 239.4 },
          { srNo: 2, productName: 'Multi Millet Noodles', hsnSac: '19023010', quantity: 3, unit: 'PCS', unitRate: 76, taxableAmount: 228, cgstRate: 2.5, cgstAmount: 5.7, sgstRate: 2.5, sgstAmount: 5.7, totalAmount: 239.4 },
          { srNo: 3, productName: 'Black Rice Noodles', hsnSac: '19023010', quantity: 3, unit: 'PCS', unitRate: 76, taxableAmount: 228, cgstRate: 2.5, cgstAmount: 5.7, sgstRate: 2.5, sgstAmount: 5.7, totalAmount: 239.4 },
          { srNo: 4, productName: 'Red Rice Noodles', hsnSac: '19023010', quantity: 3, unit: 'PCS', unitRate: 76, taxableAmount: 228, cgstRate: 2.5, cgstAmount: 5.7, sgstRate: 2.5, sgstAmount: 5.7, totalAmount: 239.4 },
          { srNo: 5, productName: 'Moringa Pasta', hsnSac: '19023010', quantity: 3, unit: 'PCS', unitRate: 76, taxableAmount: 228, cgstRate: 2.5, cgstAmount: 5.7, sgstRate: 2.5, sgstAmount: 5.7, totalAmount: 239.4 },
          { srNo: 6, productName: 'Black Rice Pasta', hsnSac: '19023010', quantity: 3, unit: 'PCS', unitRate: 76, taxableAmount: 228, cgstRate: 2.5, cgstAmount: 5.7, sgstRate: 2.5, sgstAmount: 5.7, totalAmount: 239.4 },
          { srNo: 7, productName: 'Red Rice Pasta', hsnSac: '19023010', quantity: 3, unit: 'PCS', unitRate: 76, taxableAmount: 228, cgstRate: 2.5, cgstAmount: 5.7, sgstRate: 2.5, sgstAmount: 5.7, totalAmount: 239.4 },
        ],
        subTotal: 1596,
        totalCgst: 39.9,
        totalSgst: 39.9,
        totalTax: 79.8,
        grandTotal: 1675.8,
        amountPaid: 0,
        balanceDue: 1675.8,
        paymentStatus: 'unpaid',
        status: 'issued',
        pdfAttachment: {
          originalName: 'STF004.pdf',
          filename: targetFile004,
          path: filePath004,
          url: fileUrl004,
          size: stats004.size,
          uploadedAt: stats004.mtime,
        },
      });
    }

    // 3. Clear wrong attachments from INV-0001
    const inv1 = await Invoice.findOne({ invoiceNumber: 'INV-0001' });
    if (inv1 && inv1.pdfAttachment) {
      inv1.pdfAttachment = undefined;
      await inv1.save();
    }

    stfMigrated = true;
  } catch (err) {
    console.error('Migration error for invoices:', err);
  }
};

let branchesUpdated = false;
const updateBranchesForExistingInvoices = async () => {
  try {
    const invoices = await Invoice.find({});
    for (const inv of invoices) {
      let branchName = inv.customer?.branch || inv.branch || '';

      // If branchName is invalid like 'Address as per invoice', wipe it
      if (!branchName || /address as per invoice/i.test(branchName)) {
        branchName = '';
      }

      // 1. Check known invoice numbers
      if (!branchName) {
        if (inv.invoiceNumber === 'STF005') branchName = 'Podanur';
        else if (inv.invoiceNumber === 'STF006') branchName = 'Kuniyamuthur';
        else if (inv.invoiceNumber === 'STF001' || inv.invoiceNumber === 'STF011') branchName = 'Sundarapuram';
        else if (inv.invoiceNumber === 'STF004') branchName = 'Uppilipalayam';
        else if (inv.invoiceNumber === 'STF007' || inv.invoiceNumber === 'STF008') branchName = 'Karumbukkadai';
      }

      // 2. Check billing address
      if (!branchName) {
        const addr = inv.customer?.billingAddress?.line1 || '';
        const city = inv.customer?.billingAddress?.city || '';
        if (/podanur/i.test(addr) || /podanur/i.test(city)) branchName = 'Podanur';
        else if (/kuniyamuthur/i.test(addr) || /kuniyamuthur/i.test(city)) branchName = 'Kuniyamuthur';
        else if (/sundarapuram/i.test(addr) || /sundarapuram/i.test(city)) branchName = 'Sundarapuram';
        else if (/karumbukkadai|saramedu/i.test(addr) || /karumbukkadai/i.test(city)) branchName = 'Karumbukkadai';
        else if (/uppilipalayam/i.test(addr) || /uppilipalayam/i.test(city)) branchName = 'Uppilipalayam';
        else if (/mettupalayam/i.test(addr) || /mettupalayam/i.test(city)) branchName = 'Mettupalayam';
      }

      // 3. Clear 'address as per invoice' if found in billingAddress.line1
      if (inv.customer?.billingAddress?.line1 && /address as per invoice/i.test(inv.customer.billingAddress.line1)) {
        inv.customer.billingAddress.line1 = '';
        await inv.save();
      }

      // 4. Save if changed
      if (branchName && (inv.branch !== branchName || inv.customer?.branch !== branchName)) {
        inv.branch = branchName;
        if (!inv.customer) inv.customer = {};
        inv.customer.branch = branchName;
        await inv.save();
      }

      // 5. Ensure attached PDF name follows: [Customer Name]- invoice  [dd-MM-yyyy].pdf
      if (inv.pdfAttachment && inv.customer?.name && inv.invoiceDate) {
        const parts = inv.invoiceDate.split('T')[0].split('-');
        const dateStr = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : inv.invoiceDate;
        const targetName = `${inv.customer.name.trim()}- invoice  ${dateStr}.pdf`;
        if (inv.pdfAttachment.originalName !== targetName) {
          inv.pdfAttachment.originalName = targetName;
          await inv.save();
        }
      }
    }

    // Also update Customer records if branch is missing or invalid
    const customers = await Customer.find({});
    for (const cust of customers) {
      if (cust.billingAddress?.line1 && /address as per invoice/i.test(cust.billingAddress.line1)) {
        cust.billingAddress.line1 = '';
        await cust.save();
      }
      if (!cust.branch || /address as per invoice/i.test(cust.branch)) {
        let b = '';
        const addr = cust.billingAddress?.line1 || '';
        const city = cust.billingAddress?.city || '';
        if (/podanur/i.test(addr) || /podanur/i.test(city)) b = 'Podanur';
        else if (/kuniyamuthur/i.test(addr) || /kuniyamuthur/i.test(city)) b = 'Kuniyamuthur';
        else if (/sundarapuram/i.test(addr) || /sundarapuram/i.test(city)) b = 'Sundarapuram';
        else if (/karumbukkadai|saramedu/i.test(addr) || /karumbukkadai/i.test(city)) b = 'Karumbukkadai';
        else if (/uppilipalayam/i.test(addr) || /uppilipalayam/i.test(city)) b = 'Uppilipalayam';
        else if (city && !/coimbatore/i.test(city)) b = city;

        if (b) {
          cust.branch = b;
          await cust.save();
        }
      }
    }
  } catch (err) {
    console.error('Failed to auto-update branches for invoices:', err.message);
  }
};

// GET /api/invoices
const getAll = async (req, res) => {
  try {
    await checkAndMigrateUploadedStf011();
    await updateBranchesForExistingInvoices();
    const { search, status, paymentStatus, from, to, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (from || to) {
      query.invoiceDate = {};
      if (from) query.invoiceDate.$gte = from;
      if (to)   query.invoiceDate.$lte = to.length === 10 ? to + 'T23:59:59.999Z' : to;
    }
    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') },
        { 'customer.branch': new RegExp(search, 'i') },
        { branch: new RegExp(search, 'i') },
        { 'customer.billingAddress.line1': new RegExp(search, 'i') },
        { 'customer.billingAddress.city': new RegExp(search, 'i') },
      ];
    }
    const lim = Number(limit);
    const isUnlimited = lim === 0 || isNaN(lim);
    const skip = isUnlimited ? 0 : (Number(page) - 1) * lim;

    const [invoices, total] = await Promise.all([
      isUnlimited
        ? Invoice.find(query).sort({ invoiceDate: -1, createdAt: -1 })
        : Invoice.find(query).sort({ invoiceDate: -1, createdAt: -1 }).skip(skip).limit(lim),
      Invoice.countDocuments(query),
    ]);
    res.json({ invoices, total, page: Number(page), limit: isUnlimited ? total : lim });
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

    // Clean up invalid branch like 'Address as per invoice'
    let b = invoice.customer?.branch || invoice.branch || '';
    if (!b || /address as per invoice/i.test(b)) {
      if (invoice.invoiceNumber === 'STF005') b = 'Podanur';
      else if (invoice.invoiceNumber === 'STF006') b = 'Kuniyamuthur';
      else if (invoice.invoiceNumber === 'STF001' || invoice.invoiceNumber === 'STF011') b = 'Sundarapuram';
      else if (invoice.invoiceNumber === 'STF004') b = 'Uppilipalayam';
      else if (invoice.invoiceNumber === 'STF007' || invoice.invoiceNumber === 'STF008') b = 'Karumbukkadai';
      else if (/kuniyamuthur/i.test(invoice.customer?.billingAddress?.line1 || '')) b = 'Kuniyamuthur';
      else if (/podanur/i.test(invoice.customer?.billingAddress?.line1 || '')) b = 'Podanur';

      if (b) {
        invoice.branch = b;
        if (!invoice.customer) invoice.customer = {};
        invoice.customer.branch = b;
        await invoice.save();
      }
    }

    if (invoice.customer?.billingAddress?.line1 && /address as per invoice/i.test(invoice.customer.billingAddress.line1)) {
      invoice.customer.billingAddress.line1 = '';
      await invoice.save();
    }

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
    const branchName = req.body.branch || req.body.customer?.branch;
    if (branchName) {
      req.body.branch = branchName;
      if (!req.body.customer) req.body.customer = {};
      req.body.customer.branch = branchName;
    }
    if (req.body.paymentTerms && req.body.paymentTerms.toLowerCase() === 'paid') {
      req.body.paymentStatus = 'paid';
      if (req.body.grandTotal !== undefined && !req.body.amountPaid) {
        req.body.amountPaid = req.body.grandTotal;
        req.body.balanceDue = 0;
      }
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
    const existing = await Invoice.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Invoice not found' });

    // Normalize invoiceDate if provided
    if (req.body.invoiceDate) {
      const s = String(req.body.invoiceDate).trim().split('T')[0];
      const parts = s.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          req.body.invoiceDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
          req.body.invoiceDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    const branchName = req.body.branch || req.body.customer?.branch;
    if (branchName) {
      req.body.branch = branchName;
      if (!req.body.customer) req.body.customer = existing.customer || {};
      req.body.customer.branch = branchName;
    }

    if (req.body.paymentTerms && req.body.paymentTerms.toLowerCase() === 'paid') {
      req.body.paymentStatus = 'paid';
      const gt = req.body.grandTotal !== undefined ? Number(req.body.grandTotal) : existing.grandTotal;
      req.body.amountPaid = gt;
      req.body.balanceDue = 0;
    } else if (req.body.grandTotal !== undefined) {
      const amountPaid = existing.amountPaid || 0;
      req.body.balanceDue = Math.max(0, Number(req.body.grandTotal) - amountPaid);
      if (req.body.balanceDue === 0 && req.body.grandTotal > 0) {
        req.body.paymentStatus = 'paid';
      } else if (amountPaid > 0 && req.body.balanceDue > 0) {
        req.body.paymentStatus = 'partial';
      } else {
        req.body.paymentStatus = 'unpaid';
      }
    }

    // Preserve existing pdfAttachment if not explicitly passed in req.body
    if (existing.pdfAttachment && !req.body.pdfAttachment) {
      const finalDate = req.body.invoiceDate || existing.invoiceDate;
      const finalCustName = req.body.customer?.name || existing.customer?.name || 'Customer';
      let formattedDate = 'date';
      if (finalDate) {
        const parts = finalDate.split('T')[0].split('-');
        formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : finalDate;
      }
      const descriptiveName = `${finalCustName.trim()}- invoice  ${formattedDate}.pdf`;
      const attObj = existing.pdfAttachment.toObject ? existing.pdfAttachment.toObject() : existing.pdfAttachment;
      req.body.pdfAttachment = {
        ...attObj,
        originalName: descriptiveName,
      };
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
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

// POST /api/invoices/:id/upload-pdf
const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Remove old file if exists
    if (invoice.pdfAttachment && invoice.pdfAttachment.path && fs.existsSync(invoice.pdfAttachment.path)) {
      try { fs.unlinkSync(invoice.pdfAttachment.path); } catch (e) { console.error('Failed to unlink old PDF', e); }
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/invoices/${req.file.filename}`;

    let formattedDate = 'date';
    if (invoice.invoiceDate) {
      const parts = invoice.invoiceDate.split('T')[0].split('-');
      formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : invoice.invoiceDate;
    }
    const custName = (invoice.customer?.name || 'Customer').trim();
    const descriptiveName = `${custName}- invoice  ${formattedDate}.pdf`;

    invoice.pdfAttachment = {
      originalName: descriptiveName,
      filename:     req.file.filename,
      path:         req.file.path,
      url:          fileUrl,
      size:         req.file.size,
      uploadedAt:   new Date(),
    };

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/invoices/:id/pdf
const deletePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    if (invoice.pdfAttachment && invoice.pdfAttachment.path && fs.existsSync(invoice.pdfAttachment.path)) {
      try { fs.unlinkSync(invoice.pdfAttachment.path); } catch (e) { console.error('Failed to remove PDF', e); }
    }

    invoice.pdfAttachment = undefined;
    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/invoices/parse-pdf
const parsePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }
    const buf = fs.readFileSync(req.file.path);
    const data = extractPdfInvoiceData(buf);
    try { fs.unlinkSync(req.file.path); } catch {}
    res.json(data);
  } catch (err) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ message: err.message });
  }
};

// POST /api/invoices/upload-new
const createWithPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    let autoData = {};
    try {
      if (fs.existsSync(req.file.path)) {
        autoData = extractPdfInvoiceData(fs.readFileSync(req.file.path)) || {};
      }
    } catch {}

    const {
      invoiceNumber,
      invoiceDate,
      branch,
      customerName,
      customerGstin,
      customerPhone,
      customerAddress,
      customerCity = 'Coimbatore',
      customerState = 'Tamil Nadu',
      customerStateCode = '33',
      customerPincode = '641024',
      grandTotal,
      subTotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      paymentStatus = 'unpaid',
      status = 'issued',
      notes,
      items: itemsJson,
    } = req.body;

    const finalCustName = customerName?.trim() || autoData.customerName || 'Walk-in Customer';
    const finalBranch = branch?.trim() || autoData.branch || '';

    let finalInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : (autoData.invoiceNumber || '');
    if (!finalInvoiceNumber) {
      finalInvoiceNumber = await getNextInvoiceNumber();
    } else {
      const exists = await Invoice.findOne({ invoiceNumber: finalInvoiceNumber });
      if (exists) {
        if (req.file.path && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch {}
        }
        return res.status(400).json({ message: `Invoice number "${finalInvoiceNumber}" already exists` });
      }
    }

    const finalDate = invoiceDate || autoData.invoiceDate || new Date().toISOString().split('T')[0];
    const finalGstin = customerGstin?.trim() || autoData.customerGstin || '';
    const total = Number(grandTotal) || Number(autoData.grandTotal) || 0;
    const isPaid = paymentStatus === 'paid';
    const amountPaid = isPaid ? total : 0;
    const balanceDue = isPaid ? 0 : total;

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/invoices/${req.file.filename}`;

    let parsedItems = [];
    if (itemsJson) {
      try {
        parsedItems = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
      } catch {}
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      parsedItems = [
        {
          srNo: 1,
          productName: 'Invoice as per attached PDF',
          quantity: 1,
          unit: 'NOS',
          unitRate: total,
          taxableAmount: Number(subTotal) || total,
          cgstAmount: Number(cgstAmount) || 0,
          sgstAmount: Number(sgstAmount) || 0,
          igstAmount: Number(igstAmount) || 0,
          totalAmount: total,
        },
      ];
    }

    // Upsert customer if not existing
    let customerDoc = await Customer.findOne({ name: new RegExp(`^${finalCustName}$`, 'i') });
    if (!customerDoc) {
      try {
        customerDoc = await Customer.create({
          name: finalCustName,
          branch: finalBranch,
          gstin: finalGstin,
          phone: customerPhone?.trim() || '',
          billingAddress: {
            line1: customerAddress?.trim() || '',
            city: customerCity || 'Coimbatore',
            state: customerState || 'Tamil Nadu',
            stateCode: customerStateCode || '33',
            pincode: customerPincode || '641024',
          },
        });
      } catch (e) {
        console.warn('Customer auto-create skipped:', e.message);
      }
    }

    let formattedPdfDate = 'date';
    if (finalDate) {
      const parts = finalDate.split('T')[0].split('-');
      formattedPdfDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : finalDate;
    }
    const descriptivePdfName = `${finalCustName.trim()}- invoice  ${formattedPdfDate}.pdf`;

    const invoiceData = {
      invoiceNumber: finalInvoiceNumber,
      invoiceDate: finalDate,
      branch: finalBranch || customerDoc?.branch || '',
      paymentTerms: req.body.paymentTerms || autoData.paymentTerms || 'Credit',
      seller: DEFAULT_SELLER,
      customerId: customerDoc?._id,
      customer: {
        name: finalCustName,
        branch: finalBranch || customerDoc?.branch || '',
        gstin: finalGstin || (customerDoc?.gstin || ''),
        phone: customerPhone ? customerPhone.trim() : (customerDoc?.phone || ''),
        billingAddress: {
          line1: customerAddress ? customerAddress.trim() : (customerDoc?.billingAddress?.line1 || ''),
          city: customerCity || customerDoc?.billingAddress?.city || 'Coimbatore',
          state: customerState || customerDoc?.billingAddress?.state || 'Tamil Nadu',
          stateCode: customerStateCode || customerDoc?.billingAddress?.stateCode || '33',
          pincode: customerPincode || customerDoc?.billingAddress?.pincode || '641024',
        },
        state: customerState || customerDoc?.billingAddress?.state || 'Tamil Nadu',
        stateCode: customerStateCode || customerDoc?.billingAddress?.stateCode || '33',
      },
      items: parsedItems,
      subTotal: Number(subTotal) || total,
      totalCgst: Number(cgstAmount) || 0,
      totalSgst: Number(sgstAmount) || 0,
      totalIgst: Number(igstAmount) || 0,
      totalTax: (Number(cgstAmount) || 0) + (Number(sgstAmount) || 0) + (Number(igstAmount) || 0),
      grandTotal: total,
      amountPaid,
      balanceDue,
      paymentStatus: paymentStatus || 'unpaid',
      status: status || 'issued',
      notes: notes || 'Uploaded PDF invoice',
      pdfAttachment: {
        originalName: descriptivePdfName,
        filename: req.file.filename,
        path: req.file.path,
        url: fileUrl,
        size: req.file.size,
        uploadedAt: new Date(),
      },
    };

    const invoice = await Invoice.create(invoiceData);
    res.status(201).json(invoice);
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/invoices/:id
const remove = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Clean up attached PDF file if exists
    if (invoice.pdfAttachment && invoice.pdfAttachment.path && fs.existsSync(invoice.pdfAttachment.path)) {
      try { fs.unlinkSync(invoice.pdfAttachment.path); } catch (e) { console.error('Failed to unlink PDF on invoice delete:', e); }
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAll,
  getById,
  getByNumber,
  create,
  update,
  issue,
  cancel,
  addPayment,
  nextNumber,
  reportSummary,
  uploadPdf,
  deletePdf,
  createWithPdf,
  parsePdf,
  remove,
};
