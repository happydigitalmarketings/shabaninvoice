import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Search } from 'lucide-react';
import { invoicesApi } from '../../api/invoices.api';
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
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(defaultInvoiceId || '');
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingInvoices(true);
        const res = await invoicesApi.getAll({ limit: 100 });
        const list: InvoiceOption[] = res.data.invoices || [];
        setInvoices(list);
        if (!defaultInvoiceId && list.length > 0) {
          setSelectedInvoiceId(list[0]._id);
        }
      } catch {
        toast.error('Could not load invoices list');
      } finally {
        setLoadingInvoices(false);
      }
    })();
  }, [defaultInvoiceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file?: File) => {
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
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleUpload = async () => {
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice to attach the PDF to');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a PDF file to upload');
      return;
    }

    try {
      setUploading(true);
      await invoicesApi.uploadPdf(selectedInvoiceId, selectedFile);
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

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customer?.name || '').toLowerCase().includes(q)
    );
  });

  const selectedInvoice = invoices.find((inv) => inv._id === selectedInvoiceId);

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: 540, width: '90%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(37, 99, 235, 0.12)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                Upload & Attach PDF Invoice
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Attach an existing or manual PDF invoice to a system record
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={uploading}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Invoice Selection */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Select Invoice to Attach to <span className="required">*</span>
            </label>

            {invoices.length > 5 && (
              <div className="search-bar" style={{ marginBottom: '8px' }}>
                <Search size={14} />
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: 'var(--text-xs)', padding: '6px 8px' }}
                  placeholder="Filter by invoice # or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            {loadingInvoices ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                <div className="spinner spinner-sm" /> Loading invoices...
              </div>
            ) : (
              <select
                className="form-select"
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                disabled={uploading}
              >
                {filteredInvoices.map((inv) => (
                  <option key={inv._id} value={inv._id}>
                    {inv.invoiceNumber} — {inv.customer?.name || 'Walk-in'} (₹{inv.grandTotal})
                    {inv.pdfAttachment ? ' [PDF already attached - will replace]' : ''}
                  </option>
                ))}
              </select>
            )}

            {selectedInvoice?.pdfAttachment && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-warning)',
                }}
              >
                <AlertCircle size={13} />
                <span>
                  This invoice already has <strong>{selectedInvoice.pdfAttachment.originalName}</strong> attached. Uploading will replace it.
                </span>
              </div>
            )}
          </div>

          {/* Drag & Drop / File Selection */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Select PDF File <span className="required">*</span>
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
                border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(37, 99, 235, 0.05)' : 'var(--color-bg-secondary)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  margin: '0 auto 10px',
                  borderRadius: '50%',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={22} />
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                {selectedFile ? selectedFile.name : 'Click to browse or drag & drop PDF here'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB — Ready to attach`
                  : 'Only PDF format accepted (max 20MB)'}
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading || !selectedInvoiceId || !selectedFile}
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
        </div>
      </div>
    </div>
  );
};

export default UploadInvoicePdfModal;
