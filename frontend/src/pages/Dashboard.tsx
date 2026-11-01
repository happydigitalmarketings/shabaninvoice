import React, { useEffect, useState } from 'react';
import { FileText, Users, Package, TrendingUp, IndianRupee, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { invoicesApi } from '../api/invoices.api';
import { formatCurrency } from '../utils/formatCurrency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  outstanding: number;
  paidThisMonth: number;
  recentInvoices: Array<{
    _id: string;
    invoiceNumber: string;
    customer: { name: string };
    grandTotal: number;
    paymentStatus: string;
    invoiceDate: string;
    status: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const from  = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
  const to    = format(today, 'yyyy-MM-dd');

  useEffect(() => {
    (async () => {
      try {
        const [summaryRes, recentRes] = await Promise.all([
          invoicesApi.getReportSummary(from, to),
          invoicesApi.getAll({ limit: 5, status: 'issued' }),
        ]);
        setStats({
          totalInvoices:  summaryRes.data.totalInvoices   || 0,
          totalRevenue:   summaryRes.data.totalRevenue     || 0,
          outstanding:    summaryRes.data.outstanding      || 0,
          paidThisMonth:  summaryRes.data.paidThisMonth   || 0,
          recentInvoices: recentRes.data.invoices         || [],
        });
      } catch {
        toast.error('Could not load dashboard data');
        setStats({
          totalInvoices: 0, totalRevenue: 0,
          outstanding: 0, paidThisMonth: 0, recentInvoices: [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  const statCards = [
    {
      label: 'Total Invoices (This Month)',
      value: stats?.totalInvoices ?? '—',
      icon: FileText,
      color: 'rgba(200,82,26,0.15)',
      iconColor: 'var(--color-primary-light)',
    },
    {
      label: 'Revenue (This Month)',
      value: stats ? formatCurrency(stats.totalRevenue) : '—',
      icon: IndianRupee,
      color: 'rgba(34,197,94,0.12)',
      iconColor: 'var(--color-success)',
    },
    {
      label: 'Outstanding Amount',
      value: stats ? formatCurrency(stats.outstanding) : '—',
      icon: AlertCircle,
      color: 'rgba(245,158,11,0.12)',
      iconColor: 'var(--color-warning)',
    },
    {
      label: 'Paid This Month',
      value: stats ? formatCurrency(stats.paidThisMonth) : '—',
      icon: CheckCircle,
      color: 'rgba(59,130,246,0.12)',
      iconColor: 'var(--color-info)',
    },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      unpaid: 'badge badge-unpaid',
      partial: 'badge badge-partial',
      paid:    'badge badge-paid',
      draft:   'badge badge-draft',
    };
    return <span className={map[status] || 'badge badge-draft'}>{status}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {format(today, 'EEEE, dd MMMM yyyy')} — Overview for this month
          </p>
        </div>
        <div className="page-actions">
          <Link to="/invoices/new" className="btn btn-primary">
            <FileText size={16} /> New Invoice
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {statCards.map(({ label, value, icon: Icon, color, iconColor }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card-icon" style={{ background: color }}>
              <Icon size={22} color={iconColor} />
            </div>
            <div className="stat-card-value">
              {loading ? <span style={{ animation: 'pulse 1.5s infinite' }}>—</span> : value}
            </div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {[
          { to: '/invoices', icon: FileText, label: 'All Invoices', color: 'var(--color-primary)' },
          { to: '/customers', icon: Users, label: 'Customers', color: 'var(--color-secondary-light)' },
          { to: '/products', icon: Package, label: 'Products', color: 'var(--color-accent)' },
          { to: '/reports', icon: TrendingUp, label: 'Reports', color: 'var(--color-info)' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to} className="card" style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            textDecoration: 'none', transition: 'all var(--transition-fast)',
            padding: 'var(--space-4)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={20} color={color} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Invoices</h2>
          <Link to="/invoices" className="btn btn-ghost btn-sm">View All</Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
          </div>
        ) : stats?.recentInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Clock size={28} color="var(--color-text-muted)" /></div>
            <p className="empty-state-title">No invoices yet</p>
            <p style={{ fontSize: 'var(--text-sm)' }}>Create your first invoice to get started.</p>
            <Link to="/invoices/new" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
              Create Invoice
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
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentInvoices.map(inv => (
                  <tr key={inv._id}>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{inv.invoiceNumber}</span></td>
                    <td>{inv.customer?.name || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {format(new Date(inv.invoiceDate), 'dd MMM yyyy')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(inv.grandTotal)}</td>
                    <td>{statusBadge(inv.paymentStatus)}</td>
                    <td>
                      <Link to={`/invoices/${inv._id}`} className="btn btn-ghost btn-sm">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
