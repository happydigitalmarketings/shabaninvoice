import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Printer, Edit, CheckCircle, XCircle, IndianRupee, ArrowLeft } from 'lucide-react';
import { invoicesApi } from '../api/invoices.api';
import type { Invoice } from '../types/invoice.types';
import { formatINR } from '../utils/formatCurrency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
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
    window.print();
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
          {isDraft && (
            <>
              <Link to={`/invoices/${id}/edit`} className="btn btn-secondary">
                <Edit size={16} /> Edit
              </Link>
              <button className="btn btn-success" onClick={handleIssue} disabled={issuing}>
                <CheckCircle size={16} /> {issuing ? 'Issuing...' : 'Issue Invoice'}
              </button>
            </>
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

          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

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
