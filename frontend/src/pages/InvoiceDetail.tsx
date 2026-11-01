import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Printer,
  Edit,
  CheckCircle,
  XCircle,
  IndianRupee,
  ArrowLeft,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { invoicesApi } from '../api/invoices.api';
import type { Invoice } from '../types/invoice.types';
import { formatINR } from '../utils/formatCurrency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import InvoicePreview from '../components/invoice/InvoicePreview';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [deletingPdf, setDeletingPdf] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPdfFilename = () => {
    let dateStr = 'date';
    if (invoice?.invoiceDate) {
      try {
        dateStr = format(new Date(invoice.invoiceDate), 'dd-MM-yyyy');
      } catch {
        dateStr = (invoice.invoiceDate || '').split('T')[0];
      }
    }
    const custName = (invoice?.customer?.name || 'Customer').trim();
    return `${custName}- invoice  ${dateStr}.pdf`;
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await invoicesApi.getById(id);
        setInvoice(res.data);
      } catch {
        toast.error('Invoice not found');
        navigate('/invoices');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  useEffect(() => {
    if (invoice) {
      const filename = getPdfFilename().replace(/\.pdf$/i, '');
      document.title = filename;
    }
    return () => {
      document.title = 'Shaban Foods Billing System';
    };
  }, [invoice]);

  const handleIssue = async () => {
    if (!id) return;
    try {
      setIssuing(true);
      await invoicesApi.issue(id);
      toast.success('Invoice issued successfully!');
      const res = await invoicesApi.getById(id);
      setInvoice(res.data);
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not issue invoice');
    } finally {
      setIssuing(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !cancelReason.trim()) { toast.error('Please provide a cancellation reason'); return; }
    try {
      await invoicesApi.cancel(id, cancelReason);
      toast.success('Invoice cancelled');
      const res = await invoicesApi.getById(id);
      setInvoice(res.data);
      setShowCancelModal(false);
    } catch {
      toast.error('Could not cancel invoice');
    }
  };

  const handlePrint = () => {
    const filename = getPdfFilename().replace(/\.pdf$/i, '');
    const oldTitle = document.title;
    document.title = filename;
    window.print();
    setTimeout(() => {
      document.title = filename;
    }, 1500);
  };

  const handleDownloadPdf = async () => {
    const filename = getPdfFilename();

    // If attached PDF exists, download directly
    if (invoice?.pdfAttachment?.url) {
      const link = document.createElement('a');
      link.href = getPdfDownloadUrl(invoice.pdfAttachment.url);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${filename}`);
      return;
    }

    try {
      setDownloadingPdf(true);
      const sheet = document.querySelector('.arafa-invoice-sheet') as HTMLElement;
      if (!sheet) {
        handlePrint();
        return;
      }
      await document.fonts.ready;
      const canvas = await html2canvas(sheet, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(filename);
      toast.success(`Saved as ${filename}`);
    } catch (e) {
      console.error(e);
      handlePrint();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size cannot exceed 20MB');
      return;
    }
    try {
      setUploadingPdf(true);
      const res = await invoicesApi.uploadPdf(id, file);
      setInvoice(res.data);
      toast.success('PDF invoice attached successfully!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to upload PDF';
      toast.error(msg);
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePdf = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete the attached PDF?')) return;
    try {
      setDeletingPdf(true);
      const res = await invoicesApi.deletePdf(id);
      setInvoice(res.data);
      toast.success('Attached PDF deleted');
    } catch {
      toast.error('Could not delete attached PDF');
    } finally {
      setDeletingPdf(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!id || !invoice) return;
    if (
      !window.confirm(
        `Are you sure you want to delete invoice "${invoice.invoiceNumber}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setDeletingInvoice(true);
      await invoicesApi.delete(id);
      toast.success(`Invoice "${invoice.invoiceNumber}" deleted successfully!`);
      navigate('/invoices');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete invoice';
      toast.error(msg);
    } finally {
      setDeletingInvoice(false);
    }
  };

  const getPdfDownloadUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner spinner-lg" />
    </div>;
  }

  if (!invoice) return null;

  const isDraft   = invoice.status === 'draft';
  const isIssued  = invoice.status === 'issued';

  return (
    <div>
      {/* Hidden PDF file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePdfFileSelect}
        accept="application/pdf"
        style={{ display: 'none' }}
      />

      {/* Actions Bar */}
      <div className="page-header no-print">
        <div className="page-header-left">
          <Link to="/invoices" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Invoices
          </Link>
          <h1 className="page-title">{invoice.invoiceNumber}</h1>
          <p className="page-subtitle">
            {format(new Date(invoice.invoiceDate), 'dd MMMM yyyy')} •{' '}
            <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>{' '}
            <span className={`badge badge-${invoice.paymentStatus}`}>{invoice.paymentStatus}</span>
          </p>
        </div>

        <div className="page-actions no-print">
          {/* Upload / Replace PDF button */}
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPdf}
            title="Upload an existing PDF copy for this invoice"
          >
            <UploadCloud size={16} /> {uploadingPdf ? 'Uploading...' : invoice.pdfAttachment ? 'Replace PDF' : 'Upload PDF'}
          </button>

          {invoice.status !== 'cancelled' && (
            <Link to={`/invoices/${id}/edit`} className="btn btn-secondary">
              <Edit size={16} /> Edit
            </Link>
          )}

          {isDraft && (
            <button className="btn btn-success" onClick={handleIssue} disabled={issuing}>
              <CheckCircle size={16} /> {issuing ? 'Issuing...' : 'Issue Invoice'}
            </button>
          )}

          {isIssued && invoice.paymentStatus !== 'paid' && (
            <button className="btn btn-secondary" onClick={() => setShowPayModal(true)}>
              <IndianRupee size={16} /> Record Payment
            </button>
          )}

          {isIssued && (
            <button className="btn btn-ghost" onClick={() => setShowCancelModal(true)}>
              <XCircle size={16} /> Cancel
            </button>
          )}

          <button
            className="btn btn-ghost"
            style={{ color: 'var(--color-error, #ef4444)' }}
            onClick={handleDeleteInvoice}
            disabled={deletingInvoice}
            title="Delete this entire invoice"
          >
            <Trash2 size={16} /> {deletingInvoice ? 'Deleting...' : 'Delete'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            title={`Download invoice as ${getPdfFilename()}`}
          >
            {downloadingPdf ? <Loader2 size={16} className="spinner" /> : <Download size={16} />}
            {downloadingPdf ? 'Saving PDF...' : 'Download PDF'}
          </button>

          <button className="btn btn-primary" onClick={handlePrint} title={`Print or Save as PDF (${getPdfFilename()})`}>
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Uploaded PDF Attachment Card */}
      {invoice.pdfAttachment && (
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 18px',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(37, 99, 235, 0.15)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                  {invoice.pdfAttachment.originalName}
                </strong>
                <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 6px' }}>
                  Uploaded PDF Attached
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {(invoice.pdfAttachment.size / 1024).toFixed(1)} KB • Uploaded on{' '}
                {format(new Date(invoice.pdfAttachment.uploadedAt), 'dd MMM yyyy, hh:mm a')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <a
              href={getPdfDownloadUrl(invoice.pdfAttachment.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              title="Open uploaded PDF in new tab"
            >
              <ExternalLink size={14} /> View PDF
            </a>
            <a
              href={getPdfDownloadUrl(invoice.pdfAttachment.url)}
              download={getPdfFilename()}
              className="btn btn-secondary btn-sm"
              title={`Download as ${getPdfFilename()}`}
            >
              <Download size={14} /> Download
            </a>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-danger)' }}
              onClick={handleDeletePdf}
              disabled={deletingPdf}
              title="Remove attached PDF"
            >
              <Trash2 size={14} /> {deletingPdf ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Invoice Preview */}
      <InvoicePreview invoice={invoice} />

      {/* Record Payment Modal */}
      {showPayModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPayModal(false)}
          onSaved={async () => {
            setShowPayModal(false);
            const res = await invoicesApi.getById(id!);
            setInvoice(res.data);
          }}
        />
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Cancel Invoice</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
                Cancelling an issued invoice cannot be undone. Please provide a reason.
              </p>
              <div className="form-group">
                <label className="form-label">Cancellation Reason <span className="required">*</span></label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer returned goods, data entry error..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>Keep Invoice</button>
              <button className="btn btn-danger" onClick={handleCancel}>Confirm Cancellation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Payment Recording Modal
interface PaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ invoice, onClose, onSaved }) => {
  const [amount, setAmount]   = useState(invoice.balanceDue.toString());
  const [method, setMethod]   = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'>('upi');
  const [ref, setRef]         = useState('');
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      setSaving(true);
      await invoicesApi.addPayment(invoice._id!, {
        date, amount: Number(amount), method, reference: ref,
      });
      toast.success('Payment recorded!');
      onSaved();
    } catch {
      toast.error('Could not record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Record Payment</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
              <span>Invoice Total:</span><strong>₹{formatINR(invoice.grandTotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-warning)' }}>
              <span>Balance Due:</span><strong>₹{formatINR(invoice.balanceDue)}</strong>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Amount (₹) <span className="required">*</span></label>
              <input type="number" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} min={0.01} step={0.01} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={method} onChange={e => setMethod(e.target.value as typeof method)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reference / UTR / Cheque No.</label>
            <input type="text" className="form-input" value={ref} onChange={e => setRef(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
