import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Search, AlertTriangle, UploadCloud, FileText, X } from 'lucide-react';
import { invoicesApi } from '../api/invoices.api';
import { productsApi } from '../api/products.api';
import { customersApi } from '../api/customers.api';
import type { Product } from '../types/product.types';
import type { Customer } from '../types/customer.types';
import type { InvoiceItem } from '../types/invoice.types';
import { calculateLineItem, calculateInvoiceTotals } from '../utils/gst.utils';
import { amountToWords } from '../utils/numberToWords';
import { formatINR } from '../utils/formatCurrency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: '37' }, { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' }, { name: 'Bihar', code: '10' },
  { name: 'Chhattisgarh', code: '22' }, { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' }, { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' }, { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' }, { name: 'Kerala', code: '32' },
  { name: 'Madhya Pradesh', code: '23' }, { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' }, { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' }, { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' }, { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' }, { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' }, { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' }, { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' }, { name: 'West Bengal', code: '19' },
  { name: 'Delhi', code: '07' }, { name: 'Jammu & Kashmir', code: '01' },
  { name: 'Ladakh', code: '38' }, { name: 'Chandigarh', code: '04' },
  { name: 'Puducherry', code: '34' },
];

const emptyItem = (): InvoiceItem => ({
  srNo: 1, productName: '', hsnSac: '', quantity: 1, unit: 'BOX',
  unitRate: 0, taxableAmount: 0, cgstRate: 2.5, cgstAmount: 0,
  sgstRate: 2.5, sgstAmount: 0, igstRate: 5, igstAmount: 0, totalAmount: 0,
});

const CreateInvoice: React.FC = () => {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id?: string }>(); // for edit mode
  const isEdit    = Boolean(id);

  // Customer
  const [customers, setCustomers]       = useState<Customer[]>([]);
  const [custSearch, setCustSearch]     = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [showCustDrop, setShowCustDrop] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);

  // Invoice fields
  const [invNumber, setInvNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentTerms, setPaymentTerms] = useState('Credit');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [eWayBill, setEWayBill]   = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [isInterState, setIsInterState] = useState(false);
  const [notes, setNotes]         = useState('');
  const [attachedPdf, setAttachedPdf] = useState<File | null>(null);

  // Customer form (manual entry)
  const [custName, setCustName]     = useState('');
  const [custBranch, setCustBranch] = useState('');
  const [custGstin, setCustGstin]   = useState('');
  const [custPhone, setCustPhone]   = useState('');
  const [custState, setCustState]   = useState('Tamil Nadu');
  const [custStateCode, setCustStateCode] = useState('33');
  const [billLine1, setBillLine1]   = useState('');
  const [billLine2, setBillLine2]   = useState('');
  const [billCity, setBillCity]     = useState('');
  const [billPincode, setBillPincode] = useState('');
  const [sameAsBlling, setSameAsBilling] = useState(true);

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem() }]);

  // Saving
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    productsApi.getAll().then(r => setProducts(r.data || [])).catch(() => {});
  }, []);

  // Search customers
  useEffect(() => {
    if (!custSearch) { setCustomers([]); return; }
    customersApi.getAll(custSearch).then(r => setCustomers(r.data || [])).catch(() => {});
  }, [custSearch]);

  // Auto-fetch next invoice number for new invoice
  useEffect(() => {
    if (!id) {
      invoicesApi.getNextNumber().then(res => {
        if (res.data?.number) setInvNumber(res.data.number);
      }).catch(() => {});
    }
  }, [id]);

  // Load invoice for editing
  useEffect(() => {
    if (!id) return;
    invoicesApi.getById(id).then(res => {
      const inv = res.data;
      setInvNumber(inv.invoiceNumber || '');
      let b = inv.customer?.branch || inv.branch || '';
      if (!b || /address as per invoice/i.test(b)) {
        if (inv.invoiceNumber === 'STF006') b = 'Kuniyamuthur';
        else if (inv.invoiceNumber === 'STF005') b = 'Podanur';
        else if (inv.invoiceNumber === 'STF001' || inv.invoiceNumber === 'STF011') b = 'Sundarapuram';
        else if (inv.invoiceNumber === 'STF004') b = 'Uppilipalayam';
        else if (inv.invoiceNumber === 'STF007' || inv.invoiceNumber === 'STF008') b = 'Karumbukkadai';
        else b = '';
      }
      setCustBranch(b);
      setInvoiceDate(inv.invoiceDate?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'));
      setPaymentTerms(inv.paymentTerms || 'Credit');
      setReverseCharge(inv.reverseCharge || false);
      setEWayBill(inv.eWayBillNumber || '');
      setVehicleNo(inv.vehicleNumber || '');
      setIsInterState(inv.isInterState || false);
      setNotes(inv.notes || '');
      setCustName(inv.customer?.name || '');
      setCustGstin(inv.customer?.gstin || '');
      setCustPhone(inv.customer?.phone || '');
      setCustState(inv.customer?.state || 'Tamil Nadu');
      setCustStateCode(inv.customer?.stateCode || '33');
      const ba = inv.customer?.billingAddress;
      if (ba) {
        const l1 = /address as per invoice/i.test(ba.line1 || '') ? '' : ba.line1 || '';
        setBillLine1(l1);
        setBillLine2(ba.line2 || '');
        setBillCity(ba.city || '');
        setBillPincode(ba.pincode || '');
      }
      setItems(inv.items || [{ ...emptyItem() }]);
    }).catch(() => toast.error('Could not load invoice'));
  }, [id]);

  const applyCustomer = (c: Customer) => {
    setSelectedCust(c);
    setCustName(c.name);
    let b = c.branch || '';
    if (/address as per invoice/i.test(b)) b = '';
    if (!b) b = c.billingAddress?.city || '';
    setCustBranch(b);
    setCustGstin(c.gstin || '');
    setCustPhone(c.phone || '');
    const s = INDIAN_STATES.find(s => s.name === (c.billingAddress?.state || 'Tamil Nadu'));
    setCustState(c.billingAddress?.state || 'Tamil Nadu');
    setCustStateCode(c.billingAddress?.stateCode || s?.code || '33');
    const ba = c.billingAddress;
    if (ba) {
      const l1 = /address as per invoice/i.test(ba.line1 || '') ? '' : ba.line1 || '';
      setBillLine1(l1);
      setBillLine2(ba.line2 || '');
      setBillCity(ba.city || '');
      setBillPincode(ba.pincode || '');
    } else {
      setBillLine1('');
      setBillLine2('');
      setBillCity('');
      setBillPincode('');
    }
    setIsInterState((c.billingAddress?.state || 'Tamil Nadu') !== 'Tamil Nadu');
    setShowCustDrop(false);
    setCustSearch('');
  };

  const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      updated[index] = calculateLineItem(item, isInterState) as InvoiceItem;
      return updated;
    });
  }, [isInterState]);

  const applyProduct = (index: number, product: Product) => {
    setItems(prev => {
      const updated = [...prev];
      const item: InvoiceItem = {
        ...updated[index],
        productId:   product._id,
        productName: product.name,
        hsnSac:      product.hsnSac,
        unit:        product.unit,
        unitRate:    product.unitPrice,
        cgstRate:    product.cgstRate,
        sgstRate:    product.sgstRate,
        igstRate:    product.igstRate,
      };
      updated[index] = calculateLineItem(item, isInterState) as InvoiceItem;
      return updated;
    });
  };

  const addRow = () => setItems(prev => [
    ...prev,
    { ...emptyItem(), srNo: prev.length + 1 },
  ]);

  const removeRow = (i: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, srNo: idx + 1 })));
  };

  // Recalculate when inter-state toggles
  useEffect(() => {
    setItems(prev => prev.map(item => calculateLineItem(item, isInterState) as InvoiceItem));
  }, [isInterState]);

  const totals = calculateInvoiceTotals(items);

  const buildPayload = () => ({
    ...(invNumber ? { invoiceNumber: invNumber } : {}),
    branch: custBranch,
    invoiceDate,
    paymentTerms,
    reverseCharge,
    eWayBillNumber: eWayBill,
    vehicleNumber:  vehicleNo,
    isInterState,
    placeOfSupply:  custState,
    seller: {
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
    },
    customerId:     selectedCust?._id,
    customer: {
      name:   custName,
      branch: custBranch,
      gstin:  custGstin,
      phone:  custPhone,
      state: custState,
      stateCode: custStateCode,
      billingAddress: { line1: billLine1, line2: billLine2, city: billCity, state: custState, stateCode: custStateCode, pincode: billPincode },
      shippingAddress: sameAsBlling
        ? { line1: billLine1, line2: billLine2, city: billCity, state: custState, stateCode: custStateCode, pincode: billPincode }
        : undefined,
    },
    items: items.map(it => ({ ...it })),
    ...totals,
    amountInWords: amountToWords(totals.grandTotal),
  });

  const validate = () => {
    if (!custName.trim())    { toast.error('Customer name is required'); return false; }
    if (items.some(it => !it.productName.trim())) { toast.error('All items need a product name'); return false; }
    if (items.some(it => it.quantity <= 0))        { toast.error('Quantity must be > 0'); return false; }
    if (items.some(it => it.unitRate <= 0))        { toast.error('Unit rate must be > 0'); return false; }
    if (items.some(it => !it.hsnSac.trim()))       { toast.error('HSN/SAC code is required for all items'); return false; }
    return true;
  };

  const handleSave = async (asDraft = false) => {
    if (!validate()) return;
    const setter = asDraft ? setSavingDraft : setSaving;
    try {
      setter(true);
      const payload = buildPayload();
      if (isEdit && id) {
        await invoicesApi.update(id, payload);
        if (attachedPdf) {
          try {
            await invoicesApi.uploadPdf(id, attachedPdf);
          } catch {
            toast.error('Invoice updated, but PDF upload failed');
          }
        }
        toast.success('Invoice updated!');
        navigate(`/invoices/${id}`);
      } else {
        const res = await invoicesApi.create(payload);
        const newId = res.data._id;
        if (attachedPdf) {
          try {
            await invoicesApi.uploadPdf(newId, attachedPdf);
          } catch {
            toast.error('Invoice created, but PDF upload failed');
          }
        }
        toast.success(asDraft ? 'Draft saved!' : 'Invoice created!');
        if (!asDraft) {
          await invoicesApi.issue(newId);
          toast.success('Invoice issued!');
        }
        navigate(`/invoices/${newId}`);
      }
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not save invoice');
    } finally {
      setter(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{isEdit ? `Edit Invoice ${invNumber ? `(${invNumber})` : ''}` : 'New Invoice'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update invoice details, items, or quantities' : 'Fill in the details below to create a GST tax invoice'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>

        {/* ── Customer ── */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Customer Details</h2>
          </div>

          {/* Search existing customers */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
            <label className="form-label">Search Existing Customer</label>
            <div className="search-bar">
              <Search size={16} />
              <input
                id="customer-search"
                className="form-input"
                placeholder="Type to search customers..."
                value={custSearch}
                onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                onFocus={() => setShowCustDrop(true)}
              />
            </div>
            {showCustDrop && customers.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', maxHeight: 200, overflowY: 'auto',
              }}>
                {customers.map(c => (
                  <div key={c._id} onClick={() => applyCustomer(c)} style={{
                    padding: 'var(--space-3) var(--space-4)', cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {c.billingAddress?.city} {c.gstin ? `• GSTIN: ${c.gstin}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="divider" />

          <div className="form-grid form-grid-2" style={{ gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Customer / Business Name <span className="required">*</span></label>
              <input id="cust-name" className="form-input" value={custName} onChange={e => setCustName(e.target.value)} placeholder="Customer or Business Name" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Branch <span className="required">*</span></span>
                <span style={{ fontSize: '11px', color: 'var(--color-primary-light)', fontWeight: 400 }}>e.g. Kuniyamuthur, Podanur, Sundarapuram</span>
              </label>
              <input
                id="cust-branch"
                className="form-input"
                value={custBranch}
                onChange={e => setCustBranch(e.target.value)}
                placeholder="Branch name (e.g. Kuniyamuthur, Podanur, Sundarapuram)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN</label>
              <input className="form-input" value={custGstin} onChange={e => setCustGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label className="form-label">State <span className="required">*</span></label>
              <select className="form-select" value={custState} onChange={e => {
                const st = INDIAN_STATES.find(s => s.name === e.target.value);
                setCustState(e.target.value);
                setCustStateCode(st?.code || '');
                setIsInterState(e.target.value !== 'Tamil Nadu');
              }}>
                {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Billing Address (Optional)</label>
            <div className="form-grid form-grid-2" style={{ gap: 'var(--space-3)' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <input className="form-input" value={billLine1} onChange={e => setBillLine1(e.target.value)} placeholder="Address Line 1 (optional)" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <input className="form-input" value={billLine2} onChange={e => setBillLine2(e.target.value)} placeholder="Address Line 2 (optional)" />
              </div>
              <div className="form-group">
                <input className="form-input" value={billCity} onChange={e => setBillCity(e.target.value)} placeholder="City (optional)" />
              </div>
              <div className="form-group">
                <input className="form-input" value={billPincode} onChange={e => setBillPincode(e.target.value)} placeholder="Pincode (optional)" maxLength={6} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" checked={sameAsBlling} onChange={e => setSameAsBilling(e.target.checked)} />
              Shipping address same as billing address
            </label>
          </div>

          {/* Inter-state warning */}
          {isInterState && (
            <div style={{
              marginTop: 'var(--space-3)', padding: 'var(--space-3)',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--radius-md)', display: 'flex', gap: 8, alignItems: 'flex-start',
              fontSize: 'var(--text-sm)', color: 'var(--color-warning)',
            }}>
              <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>Customer is in a different state — <strong>IGST</strong> will be applied instead of CGST+SGST.</span>
            </div>
          )}
        </div>

        {/* ── Invoice Meta ── */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Invoice Details</h2>
          </div>
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label className="form-label">Invoice Number <span className="required">*</span></label>
              <input
                className="form-input"
                value={invNumber}
                onChange={e => setInvNumber(e.target.value)}
                placeholder="e.g. STF012"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary-light)' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Branch</label>
              <input
                id="inv-branch"
                className="form-input"
                value={custBranch}
                onChange={e => setCustBranch(e.target.value)}
                placeholder="Branch (e.g. Kuniyamuthur, Podanur)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Date <span className="required">*</span></label>
              <input type="date" className="form-input" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Terms</label>
              <select className="form-select" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                <option value="Credit">Credit</option>
                <option value="Immediate">Immediate</option>
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Cash">Cash</option>
                <option value="Net 7">Net 7</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reverse Charge</label>
              <select className="form-select" value={reverseCharge ? 'yes' : 'no'} onChange={e => setReverseCharge(e.target.value === 'yes')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">E-Way Bill Number</label>
              <input className="form-input" value={eWayBill} onChange={e => setEWayBill(e.target.value)} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle / Delivery No.</label>
              <input className="form-input" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* ── Line Items ── */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Products / Items</h2>
            <button className="btn btn-secondary btn-sm" onClick={addRow}>
              <Plus size={14} /> Add Row
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th style={{ width: '25%' }}>Product</th>
                  <th style={{ width: 90 }}>HSN/SAC</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 80 }}>Unit</th>
                  <th style={{ width: 100 }}>Rate (₹)</th>
                  <th style={{ width: 100 }}>Taxable</th>
                  {!isInterState ? (
                    <>
                      <th style={{ width: 70 }}>CGST%</th>
                      <th style={{ width: 70 }}>SGST%</th>
                    </>
                  ) : <th style={{ width: 70 }}>IGST%</th>}
                  <th style={{ width: 110 }}>Total (₹)</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{item.srNo}</td>

                    {/* Product selector */}
                    <td>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="form-input"
                          style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                          value={item.productName}
                          onChange={e => updateItem(i, 'productName', e.target.value)}
                          placeholder="Type or select..."
                          list={`products-list-${i}`}
                          onInput={(e) => {
                            const val = (e.target as HTMLInputElement).value;
                            const match = products.find(p => p.name === val);
                            if (match) applyProduct(i, match);
                          }}
                        />
                        <datalist id={`products-list-${i}`}>
                          {products.filter(p => p.isActive).map(p => (
                            <option key={p._id} value={p.name} />
                          ))}
                        </datalist>
                      </div>
                    </td>

                    <td>
                      <input className="form-input" style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                        value={item.hsnSac} onChange={e => updateItem(i, 'hsnSac', e.target.value)} placeholder="1902" />
                    </td>
                    <td>
                      <input type="number" className="form-input" style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                        value={item.quantity} min={0} step={0.01} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td>
                      <select className="form-select" style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                        value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                        {['BOX','KG','G','PCS','PKT','SET','LTR','NOS'].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="number" className="form-input" style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                        value={item.unitRate} min={0} step={0.01} onChange={e => updateItem(i, 'unitRate', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      {formatINR(item.taxableAmount)}
                    </td>
                    {!isInterState ? (
                      <>
                        <td>
                          <input type="number" className="form-input" style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                            value={item.cgstRate} min={0} step={0.5} onChange={e => updateItem(i, 'cgstRate', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td>
                          <input type="number" className="form-input" style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                            value={item.sgstRate} min={0} step={0.5} onChange={e => updateItem(i, 'sgstRate', parseFloat(e.target.value) || 0)} />
                        </td>
                      </>
                    ) : (
                      <td>
                        <input type="number" className="form-input" style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                          value={item.igstRate} min={0} step={0.5} onChange={e => updateItem(i, 'igstRate', parseFloat(e.target.value) || 0)} />
                      </td>
                    )}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 'var(--text-xs)' }}>
                      ₹{formatINR(item.totalAmount)}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-icon" onClick={() => removeRow(i)} disabled={items.length === 1}
                        style={{ color: 'var(--color-error)', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                ['Sub Total', formatINR(totals.subTotal)],
                ...(isInterState
                  ? [['IGST', formatINR(totals.totalIgst)]]
                  : [['CGST', formatINR(totals.totalCgst)], ['SGST', formatINR(totals.totalSgst)]]),
                ['Total Tax', formatINR(totals.totalTax)],
                ...(Math.abs(totals.roundOff) > 0 ? [['Round Off', `${totals.roundOff > 0 ? '+' : ''}${formatINR(totals.roundOff)}`]] : []),
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <span>{label}</span><span>₹{val}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontWeight: 700, fontSize: 'var(--text-lg)', paddingTop: 'var(--space-2)',
                borderTop: '2px solid var(--color-primary)', color: 'var(--color-primary-light)',
              }}>
                <span>Grand Total</span>
                <span>₹{formatINR(totals.grandTotal)}</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {amountToWords(totals.grandTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Attach Manual / Existing PDF */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={18} color="var(--color-primary)" />
              Attach Existing / Manual PDF Invoice (Optional)
            </h2>
            {attachedPdf && (
              <span className="badge badge-success" style={{ fontSize: '11px' }}>
                PDF Selected
              </span>
            )}
          </div>
          <div style={{ padding: 'var(--space-4)' }}>
            <p style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              If you already have a physical or manually created PDF for this invoice, upload it here to attach it directly to this invoice.
            </p>
            {attachedPdf ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} color="var(--color-primary)" />
                  <div>
                    <strong style={{ fontSize: 'var(--text-sm)' }}>{attachedPdf.name}</strong>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {(attachedPdf.size / 1024).toFixed(1)} KB — Will be attached upon saving
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-danger)' }}
                  onClick={() => setAttachedPdf(null)}
                >
                  <X size={14} /> Remove
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: 'var(--color-bg-secondary)',
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                      toast.error('Only PDF files are allowed');
                      return;
                    }
                    if (file.size > 20 * 1024 * 1024) {
                      toast.error('File size cannot exceed 20MB');
                      return;
                    }
                    setAttachedPdf(file);
                  }}
                />
                <UploadCloud size={20} color="var(--color-text-muted)" />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  Click to select existing manual PDF invoice (Max 20MB)
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header"><h2 className="card-title">Notes (Optional)</h2></div>
          <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes for this invoice..." />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate(isEdit && id ? `/invoices/${id}` : '/invoices')}>Cancel</button>
          {!isEdit && (
            <button className="btn btn-secondary" onClick={() => handleSave(true)} disabled={savingDraft}>
              {savingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
          )}
          <button id="create-invoice-submit" className="btn btn-primary btn-lg" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create & Issue Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
