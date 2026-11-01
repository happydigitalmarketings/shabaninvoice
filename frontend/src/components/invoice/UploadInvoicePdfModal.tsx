import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { invoicesApi } from '../../api/invoices.api';
import { customersApi } from '../../api/customers.api';
import type { Customer } from '../../types/customer.types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface UploadInvoicePdfModalProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultInvoiceId?: string;
}

interface InvoiceOption {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer?: { name: string };
  grandTotal: number;
  pdfAttachment?: { originalName: string };
}

const UploadInvoicePdfModal: React.FC<UploadInvoicePdfModalProps> = ({
  onClose,
  onSuccess,
  defaultInvoiceId,
}) => {
  // If opened for a specific invoice, we are in 'attach-only' mode.
  // Otherwise, we are in 'add-new' mode (adding a new invoice to the list).
  const isRowAttach = Boolean(defaultInvoiceId);

  // Common file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Invoice Form Fields
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [custName, setCustName] = useState('');
  const [branch, setBranch] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Credit');
  const [payStatus, setPayStatus] = useState<'unpaid' | 'paid' | 'partial'>('unpaid');

  // Customer dropdown list for auto-fill
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // For row attach mode
  const [targetInvoice, setTargetInvoice] = useState<InvoiceOption | null>(null);

  // Auto-fetch next invoice number
  useEffect(() => {
    if (!isRowAttach && !invNumber) {
      invoicesApi
        .getNextNumber()
        .then((res) => {
          if (res.data?.number) setInvNumber(res.data.number);
        })
        .catch(() => {});
    }
  }, [isRowAttach]);

  // Load existing customers for auto-suggest
  useEffect(() => {
    customersApi
      .getAll()
      .then((res) => setCustomersList(res.data || []))
      .catch(() => {});
  }, []);

  // If in row attach mode, load that invoice's details
  useEffect(() => {
    if (defaultInvoiceId) {
      invoicesApi
        .getById(defaultInvoiceId)
        .then((res) => setTargetInvoice(res.data))
        .catch(() => {});
    }
  }, [defaultInvoiceId]);

  const validateAndSetFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size cannot exceed 20MB');
      return;
    }
    setSelectedFile(file);

    // If adding a new invoice, attempt auto-parsing on the PDF!
    if (!isRowAttach) {
      try {
        setParsing(true);
        const res = await invoicesApi.parsePdf(file);
        const data = res.data || {};

        let detectedAny = false;
        if (data.invoiceNumber) {
          setInvNumber(data.invoiceNumber);
          detectedAny = true;
        } else {
          // Fallback guess from filename
          const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
          if (/^[A-Za-z0-9_-]+$/.test(baseName) && baseName.length >= 3) {
            setInvNumber(baseName);
          }
        }

        if (data.customerName) {
          setCustName(data.customerName);
          detectedAny = true;
        }
        if (data.branch && !/address as per invoice/i.test(data.branch)) {
          setBranch(data.branch);
          detectedAny = true;
        }
        if (data.invoiceDate) {
          setInvDate(data.invoiceDate);
          detectedAny = true;
        }
        if (data.customerGstin) {
          setCustGstin(data.customerGstin);
          detectedAny = true;
        }
        if (data.grandTotal) {
          setAmount(String(data.grandTotal));
          detectedAny = true;
        }
        if (data.paymentTerms) {
          setPaymentTerms(data.paymentTerms);
          detectedAny = true;
        }

        if (detectedAny) {
          setAutoDetected(true);
          toast.success('Invoice details auto-detected from PDF!');
        }
      } catch {
        // Fallback guess from filename if parsing network fails
        const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
        if (/^[A-Za-z0-9_-]+$/.test(baseName) && baseName.length >= 3) {
          setInvNumber(baseName);
        }
      } finally {
        setParsing(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleSelectCustomer = (c: Customer) => {
    setCustName(c.name);
    let b = c.branch || '';
    if (/address as per invoice/i.test(b)) b = '';
    if (!b) b = c.billingAddress?.city || '';
    setBranch(b);
    setCustGstin(c.gstin || '');
    setCustPhone(c.phone || '');
    if (c.billingAddress?.line1) {
      setCustAddress(
        `${c.billingAddress.line1}${c.billingAddress.city ? `, ${c.billingAddress.city}` : ''}`
      );
    }
    setShowCustDropdown(false);
  };

  const handleSubmitNewInvoice = async () => {
    if (!selectedFile) {
      toast.error('Please select an invoice PDF file to upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      if (invNumber.trim()) formData.append('invoiceNumber', invNumber.trim());
      formData.append('invoiceDate', invDate);
      formData.append('customerName', custName.trim() || 'Walk-in Customer');
      if (branch.trim()) formData.append('branch', branch.trim());
      if (custGstin.trim()) formData.append('customerGstin', custGstin.trim());
      if (custPhone.trim()) formData.append('customerPhone', custPhone.trim());
      if (custAddress.trim()) formData.append('customerAddress', custAddress.trim());
      formData.append('grandTotal', amount || '0');
      formData.append('paymentTerms', paymentTerms);
      formData.append('paymentStatus', payStatus);
      formData.append('status', 'issued');

      const res = await invoicesApi.uploadNewPdfInvoice(formData);
      toast.success(`Invoice ${res.data?.invoiceNumber || ''} created & added to list!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to upload invoice PDF';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleAttachToExisting = async () => {
    if (!defaultInvoiceId) return;
    if (!selectedFile) {
      toast.error('Please select a PDF file to attach');
      return;
    }

    try {
      setUploading(true);
      await invoicesApi.uploadPdf(defaultInvoiceId, selectedFile);
      toast.success('PDF invoice attached successfully!');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to upload PDF';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: 580, width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(37, 99, 235, 0.12)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                {isRowAttach ? `Attach PDF to ${targetInvoice?.invoiceNumber || 'Invoice'}` : 'Upload & Add Invoice to List'}
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {isRowAttach
                  ? `Attach or replace physical/scanned PDF copy for invoice ${targetInvoice?.invoiceNumber || ''}`
                  : 'Upload an existing PDF invoice — it will immediately appear as an invoice entry in your list'}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={uploading}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
          {/* File Upload Box */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>
              Select Invoice PDF File <span className="required">*</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              style={{ display: 'none' }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--color-primary)' : selectedFile ? 'var(--color-success)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: selectedFile ? '14px 16px' : '22px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(37, 99, 235, 0.05)' : 'var(--color-bg-secondary)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  margin: '0 auto 8px',
                  borderRadius: '50%',
                  background: selectedFile ? 'rgba(34, 197, 94, 0.12)' : 'rgba(37, 99, 235, 0.1)',
                  color: selectedFile ? 'var(--color-success)' : 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={20} />
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                {selectedFile ? selectedFile.name : 'Click to browse or drag & drop PDF here'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {parsing ? (
                  <span style={{ color: 'var(--color-primary-light)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={12} className="spin" /> Reading invoice details from PDF...
                  </span>
                ) : selectedFile ? (
                  `${(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload`
                ) : (
                  'Only PDF format accepted (max 20MB)'
                )}
              </p>
            </div>
          </div>

          {/* If adding a new invoice, show fields auto-filled or editable */}
          {!isRowAttach && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {autoDetected && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-success)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={14} />
                  <span>Invoice details were automatically read from your PDF! You can review or edit them below.</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Invoice Number <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>(e.g. STF004)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. STF004"
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Invoice Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-3)' }}>
                {/* Customer selection / input */}
                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Customer Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type or select customer name (e.g. Jai Enterprises)"
                    value={custName}
                    onChange={(e) => {
                      setCustName(e.target.value);
                      setShowCustDropdown(true);
                    }}
                    onFocus={() => setShowCustDropdown(true)}
                  />

                  {showCustDropdown && customersList.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                        maxHeight: 180,
                        overflowY: 'auto',
                      }}
                    >
                      {customersList
                        .filter((c) => c.name.toLowerCase().includes(custName.toLowerCase()))
                        .slice(0, 8)
                        .map((c) => (
                          <div
                            key={c._id}
                            onClick={() => handleSelectCustomer(c)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: 'var(--text-xs)',
                              borderBottom: '1px solid var(--color-border-subtle)',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <strong>{c.name}</strong>
                            {c.branch && <span style={{ color: 'var(--color-primary-light)', marginLeft: 6 }}>[{c.branch}]</span>}
                            {c.gstin && <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>({c.gstin})</span>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Branch / Location
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Podanur, Kuniyamuthur"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    GSTIN <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Customer GSTIN"
                    value={custGstin}
                    onChange={(e) => setCustGstin(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Phone <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Phone number"
                    value={custPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 0.9fr', gap: 'var(--space-3)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Grand Total Amount (₹) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 1675.80"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Payment Terms
                  </label>
                  <select
                    className="form-select"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option value="Credit">Credit</option>
                    <option value="Immediate">Immediate</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Cash">Cash</option>
                    <option value="Net 7">Net 7</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Payment Status
                  </label>
                  <select
                    className="form-select"
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value as 'unpaid' | 'paid' | 'partial')}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                  Customer Address <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Street / Area / City"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* If in row attach mode, show existing invoice summary */}
          {isRowAttach && targetInvoice && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(37, 99, 235, 0.06)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div>
                Target Invoice:{' '}
                <strong style={{ color: 'var(--color-primary-light)' }}>{targetInvoice.invoiceNumber}</strong> —{' '}
                {targetInvoice.customer?.name || 'Walk-in'} (₹{targetInvoice.grandTotal})
              </div>
              {targetInvoice.pdfAttachment && (
                <div style={{ color: 'var(--color-warning)', marginTop: 4 }}>
                  ⚠️ Already has <strong>{targetInvoice.pdfAttachment.originalName}</strong> attached. Uploading will replace it.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: 'var(--space-3) var(--space-4)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          {isRowAttach ? (
            <button
              className="btn btn-primary"
              onClick={handleAttachToExisting}
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <>
                  <div className="spinner spinner-sm" style={{ marginRight: 6 }} /> Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Attach PDF
                </>
              )}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmitNewInvoice}
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <>
                  <div className="spinner spinner-sm" style={{ marginRight: 6 }} /> Adding to Invoices...
                </>
              ) : (
                <>
                  <ArrowRight size={16} /> Save & Add to Invoices List
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadInvoicePdfModal;
