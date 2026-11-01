import React, { useState } from 'react';
import { BarChart3, IndianRupee, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { invoicesApi } from '../api/invoices.api';
import { formatCurrency } from '../utils/formatCurrency';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

interface Summary {
  totalInvoices: number;
  totalRevenue: number;
  outstanding: number;
  paidThisMonth: number;
  totalTax: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
}

const Reports: React.FC = () => {
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo]     = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const quickRanges = [
    { label: 'This Month',   from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),        to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
    { label: 'Last Month',   from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') },
    { label: 'Last 3 Months',from: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
    { label: 'This Year',    from: `${new Date().getFullYear()}-01-01`,                    to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
  ];

  const fetchReport = async () => {
    if (!from || !to) { toast.error('Select date range'); return; }
    try {
      setLoading(true);
      const res = await invoicesApi.getReportSummary(from, to);
      setSummary(res.data);
    } catch { toast.error('Could not load report'); }
    finally { setLoading(false); }
  };

  const statItems = summary ? [
    { label: 'Total Invoices',     value: summary.totalInvoices.toString(),       icon: FileText,      color: 'var(--color-primary-light)', bg: 'rgba(200,82,26,0.12)' },
    { label: 'Total Revenue',      value: formatCurrency(summary.totalRevenue),   icon: IndianRupee,   color: 'var(--color-success)',        bg: 'rgba(34,197,94,0.12)' },
    { label: 'Outstanding',        value: formatCurrency(summary.outstanding),    icon: AlertCircle,   color: 'var(--color-warning)',        bg: 'rgba(245,158,11,0.12)' },
    { label: 'Total Tax Collected',value: formatCurrency(summary.totalTax),       icon: TrendingUp,    color: 'var(--color-info)',           bg: 'rgba(59,130,246,0.12)' },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Sales and tax summary by date range</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="card-header">
          <h2 className="card-title">Date Range</h2>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          {quickRanges.map(r => (
            <button key={r.label} className="btn btn-secondary btn-sm" onClick={() => { setFrom(r.from); setTo(r.to); }}>
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group">
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading} style={{ marginBottom: 1 }}>
            {loading ? 'Loading...' : <><BarChart3 size={16} /> Generate Report</>}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            {statItems.map(({ label, value, icon: Icon, color, bg }) => (
              <div className="stat-card" key={label}>
                <div className="stat-card-icon" style={{ background: bg }}>
                  <Icon size={22} color={color} />
                </div>
                <div className="stat-card-value">{value}</div>
                <div className="stat-card-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Tax Breakdown */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">GST Tax Breakdown</h2>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {format(new Date(from), 'dd MMM yyyy')} — {format(new Date(to), 'dd MMM yyyy')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)' }}>
              {[
                ['CGST Collected', formatCurrency(summary.totalCgst), '#c8521a'],
                ['SGST Collected', formatCurrency(summary.totalSgst), '#c8521a'],
                ['IGST Collected', formatCurrency(summary.totalIgst), '#3b82f6'],
                ['Total Tax',      formatCurrency(summary.totalTax),  '#22c55e'],
              ].map(([label, val, color]) => (
                <div key={label} style={{
                  background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)', borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(200,82,26,0.05)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              ℹ️ This report covers <strong>issued invoices only</strong>. Cancelled invoices are excluded. For official GST filing, consult your CA or use a GSTN-compliant filing tool.
            </div>
          </div>
        </>
      )}

      {!summary && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon"><BarChart3 size={28} color="var(--color-text-muted)" /></div>
          <p className="empty-state-title">Select a date range and generate a report</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
