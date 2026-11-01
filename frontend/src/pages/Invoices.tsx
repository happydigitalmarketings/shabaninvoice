import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Eye } from 'lucide-react';
import { invoicesApi } from '../api/invoices.api';
import { formatCurrency } from '../utils/formatCurrency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface InvoiceSummary {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: { name: string };
  grandTotal: number;
  paymentStatus: string;
  status: string;
  balanceDue: number;
}

const PAYMENT_STATUSES = ['all', 'unpaid', 'partial', 'paid'];
const STATUSES = ['all', 'draft', 'issued', 'cancelled'];

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [payStatus, setPayStatus] = useState('all');
  const [status, setStatus] = useState('issued');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.getAll({
        search:        search || undefined,
        paymentStatus: payStatus !== 'all' ? payStatus : undefined,
        status:        status   !== 'all' ? status   : undefined,
        page,
        limit,
      });
      setInvoices(res.data.invoices || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Could not load invoices');
    } finally {
      setLoading(false);
    }
  }, [search, payStatus, status, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const payBadge = (s: string) => {
    const cls: Record<string, string> = {
      unpaid:  'badge badge-unpaid',
      partial: 'badge badge-partial',
      paid:    'badge badge-paid',
      draft:   'badge badge-draft',
    };
    return <span className={cls[s] || 'badge badge-draft'}>{s}</span>;
  };

  const statusBadge = (s: string) => {
    const cls: Record<string, string> = {
      draft:     'badge badge-draft',
      issued:    'badge badge-issued',
      cancelled: 'badge badge-cancelled',
    };
    return <span className={cls[s] || 'badge badge-draft'}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{total} invoices found</p>
        </div>
        <div className="page-actions">
          <Link to="/invoices/new" className="btn btn-primary">
            <Plus size={16} /> New Invoice
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} />
            <input
              id="invoice-search"
              className="form-input"
              placeholder="Search by invoice # or customer..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Filter size={14} color="var(--color-text-muted)" />
            <select
              id="invoice-filter-status"
              className="form-select"
              style={{ width: 'auto' }}
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s}</option>)}
            </select>
            <select
              id="invoice-filter-payment"
              className="form-select"
              style={{ width: 'auto' }}
              value={payStatus}
              onChange={e => { setPayStatus(e.target.value); setPage(1); }}
            >
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Payments' : s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={28} color="var(--color-text-muted)" /></div>
            <p className="empty-state-title">No invoices found</p>
            <Link to="/invoices/new" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
              Create First Invoice
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Balance Due</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{inv.customer?.name || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {format(new Date(inv.invoiceDate), 'dd MMM yyyy')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(inv.grandTotal)}</td>
                    <td style={{ color: inv.balanceDue > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {formatCurrency(inv.balanceDue)}
                    </td>
                    <td>{payBadge(inv.paymentStatus)}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td>
                      <Link to={`/invoices/${inv._id}`} className="btn btn-ghost btn-sm">
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button className="btn btn-secondary btn-sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
