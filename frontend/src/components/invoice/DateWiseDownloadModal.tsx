import React, { useState, useEffect } from 'react';
import { Archive, X, Calendar, Loader2 } from 'lucide-react';
import { invoicesApi } from '../../api/invoices.api';
import type { Invoice } from '../../types/invoice.types';
import InvoicePreview from './InvoicePreview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subDays } from 'date-fns';
import toast from 'react-hot-toast';

interface DateWiseDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFrom?: string;
  initialTo?: string;
}

export const DateWiseDownloadModal: React.FC<DateWiseDownloadModalProps> = ({
  isOpen,
  onClose,
  initialFrom,
  initialTo,
}) => {
  const [from, setFrom] = useState(initialFrom || format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo]     = useState(initialTo || format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<string>('issued');

  // Counting state
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  // Export progress
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [renderInvoice, setRenderInvoice] = useState<Invoice | null>(null);

  // Quick preset ranges
  const presets = [
    { label: 'Today', from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Yesterday', from: format(subDays(new Date(), 1), 'yyyy-MM-dd'), to: format(subDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'This Week', from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') },
    { label: 'This Month', from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
    { label: 'Last Month', from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') },
  ];

  // Fetch count whenever from/to/status changes
  useEffect(() => {
    if (!isOpen || !from || !to) return;
    let cancelled = false;

    const checkCount = async () => {
      try {
        setCounting(true);
        const res = await invoicesApi.getAll({
          from,
          to,
          status: status !== 'all' ? status : undefined,
          limit: 1,
        });
        if (!cancelled) {
          setMatchingCount(res.data.total ?? 0);
        }
      } catch {
        if (!cancelled) setMatchingCount(null);
      } finally {
        if (!cancelled) setCounting(false);
      }
    };

    checkCount();
    return () => { cancelled = true; };
  }, [isOpen, from, to, status]);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    if (!from || !to) {
      toast.error('Please select both From and To dates');
      return;
    }

    try {
      setIsExporting(true);
      setProgress({ current: 0, total: 0, currentName: 'Fetching invoices...' });

      // Fetch all invoices for the date range (limit=0 returns unlimited)
      const res = await invoicesApi.getAll({
        from,
        to,
        status: status !== 'all' ? status : undefined,
        limit: 0,
      });

      const invoices: Invoice[] = res.data.invoices || [];

      if (invoices.length === 0) {
        toast.error('No invoices found for the selected date range');
        setIsExporting(false);
        return;
      }

      const zip = new JSZip();
      const total = invoices.length;
      setProgress({ current: 0, total, currentName: 'Starting PDF generation...' });

      for (let i = 0; i < invoices.length; i++) {
        const inv = invoices[i];
        const invoiceNum = inv.invoiceNumber || `INV-${i + 1}`;
        setProgress({
          current: i + 1,
          total,
          currentName: `Rendering ${invoiceNum} (${i + 1} of ${total})...`,
        });

        // Set the active invoice for the offscreen render container
        setRenderInvoice(inv);

        // Allow React DOM and SVG QR code to render completely
        await new Promise(resolve => setTimeout(resolve, 150));

        const renderEl = document.getElementById('datewise-invoice-render');
        if (!renderEl) continue;

        // Capture high-resolution canvas
        const canvas = await html2canvas(renderEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        const pdfBlob = pdf.output('blob');

        // Safe filename with date: e.g. STF007_06-10-2026.pdf
        const safeDate = (inv.invoiceDate || '').split('T')[0] || 'date';
        const filename = `${invoiceNum}_${safeDate}.pdf`;
        zip.file(filename, pdfBlob);
      }

      setProgress({ current: total, total, currentName: 'Compressing into ZIP...' });

      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `Shaban_Invoices_${from}_to_${to}.zip`;

      // Trigger direct browser download
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = zipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);

      toast.success(`Successfully downloaded ${total} invoice PDFs in ZIP!`);
      setIsExporting(false);
      setRenderInvoice(null);
      onClose();
    } catch (err) {
      console.error('Batch export error:', err);
      toast.error('Failed to generate ZIP. Please try again.');
      setIsExporting(false);
      setRenderInvoice(null);
    }
  };

  return (
    <>
      {/* ── Modal Dialog ── */}
      <div className="modal-overlay" style={{ zIndex: 9999 }}>
        <div className="modal" style={{ maxWidth: '520px', width: '100%' }}>
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Archive size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 className="modal-title">Download Invoices as ZIP (Date-wise)</h3>
            </div>
            {!isExporting && (
              <button className="btn btn-ghost btn-icon" onClick={onClose}>
                <X size={18} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {!isExporting ? (
              <>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Select a date range to generate and download each invoice as an individual PDF inside a single ZIP file.
                </p>

                {/* Quick Presets */}
                <div>
                  <label className="form-label" style={{ marginBottom: '6px' }}>Quick Presets</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {presets.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          background: from === p.from && to === p.to ? 'var(--color-primary)' : undefined,
                          color: from === p.from && to === p.to ? '#fff' : undefined,
                        }}
                        onClick={() => { setFrom(p.from); setTo(p.to); }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Inputs */}
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">From Date</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        className="form-input"
                        value={from}
                        onChange={e => setFrom(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Date</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        className="form-input"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="form-group">
                  <label className="form-label">Invoice Status</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="issued">Issued Invoices Only (Recommended)</option>
                    <option value="all">All Invoices (Drafts + Issued)</option>
                    <option value="draft">Drafts Only</option>
                  </select>
                </div>

                {/* Matching Count Banner */}
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: 'var(--text-sm)' }}>Invoices Found:</span>
                  </div>
                  <div>
                    {counting ? (
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Checking...</span>
                    ) : matchingCount !== null ? (
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: matchingCount > 0 ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                      }}>
                        {matchingCount} {matchingCount === 1 ? 'invoice' : 'invoices'}
                      </span>
                    ) : (
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Export Progress State */
              <div style={{ padding: '20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <Loader2 size={36} className="spinner" style={{ color: 'var(--color-primary)' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                    Generating Invoices ZIP
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {progress.currentName}
                  </div>
                </div>

                {/* Progress Bar */}
                {progress.total > 0 && (
                  <div style={{ width: '100%', maxWidth: '360px' }}>
                    <div style={{
                      height: '8px',
                      background: 'var(--color-bg-elevated)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--color-primary)',
                        width: `${Math.round((progress.current / progress.total) * 100)}%`,
                        transition: 'width 0.2s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      <span>{progress.current} of {progress.total}</span>
                      <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isExporting && (
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadZip}
                disabled={counting || matchingCount === 0}
              >
                <Archive size={16} /> Download ZIP ({matchingCount ?? 0})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Offscreen Render Container for Crisp HTML2Canvas PDF Generation ── */}
      <div
        id="offscreen-invoice-container"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '794px', // 210mm at 96 DPI
          background: '#ffffff',
          visibility: renderInvoice ? 'visible' : 'hidden',
          zIndex: -999,
        }}
      >
        {renderInvoice && (
          <div id="datewise-invoice-render">
            <InvoicePreview invoice={renderInvoice} />
          </div>
        )}
      </div>
    </>
  );
};

export default DateWiseDownloadModal;
