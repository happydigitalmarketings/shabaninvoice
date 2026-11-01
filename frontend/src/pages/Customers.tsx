import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Users, FileText } from 'lucide-react';
import { customersApi } from '../api/customers.api';
import type { Customer } from '../types/customer.types';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Chandigarh','Puducherry',
];

const STATE_CODES: Record<string, string> = {
  'Andhra Pradesh':'37','Arunachal Pradesh':'12','Assam':'18','Bihar':'10',
  'Chhattisgarh':'22','Goa':'30','Gujarat':'24','Haryana':'06',
  'Himachal Pradesh':'02','Jharkhand':'20','Karnataka':'29','Kerala':'32',
  'Madhya Pradesh':'23','Maharashtra':'27','Manipur':'14','Meghalaya':'17',
  'Mizoram':'15','Nagaland':'13','Odisha':'21','Punjab':'03','Rajasthan':'08',
  'Sikkim':'11','Tamil Nadu':'33','Telangana':'36','Tripura':'16',
  'Uttar Pradesh':'09','Uttarakhand':'05','West Bengal':'19','Delhi':'07',
  'Jammu & Kashmir':'01','Ladakh':'38','Chandigarh':'04','Puducherry':'34',
};

const emptyForm = (): Omit<Customer, '_id' | 'createdAt' | 'updatedAt'> => ({
  name: '', gstin: '', phone: '', email: '',
  sameAsBilling: true,
  billingAddress: { line1: '', line2: '', city: '', state: 'Tamil Nadu', stateCode: '33', pincode: '' },
});

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Customer | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersApi.getAll(search || undefined);
      setCustomers(res.data || []);
    } catch { toast.error('Could not load customers'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name:           c.name,
      gstin:          c.gstin || '',
      phone:          c.phone || '',
      email:          c.email || '',
      sameAsBilling:  c.sameAsBilling,
      billingAddress: c.billingAddress,
      shippingAddress: c.shippingAddress,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Customer name is required'); return; }
    if (!form.billingAddress.line1.trim()) { toast.error('Address is required'); return; }
    if (!form.billingAddress.city.trim())  { toast.error('City is required'); return; }
    try {
      setSaving(true);
      if (editing?._id) {
        await customersApi.update(editing._id, form);
        toast.success('Customer updated!');
      } else {
        await customersApi.create(form);
        toast.success('Customer added!');
      }
      setShowModal(false);
      fetchCustomers();
    } catch { toast.error('Could not save customer'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await customersApi.delete(deleteId);
      toast.success('Customer deleted');
      setDeleteId(null);
      fetchCustomers();
    } catch { toast.error('Could not delete customer'); }
  };

  const setField = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const setBillingField = (field: string, value: string) => {
    setForm(f => ({
      ...f,
      billingAddress: { ...f.billingAddress, [field]: value },
    }));
  };

  const handleStateChange = (state: string) => {
    setBillingField('state', state);
    setBillingField('stateCode', STATE_CODES[state] || '');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} customers</p>
        </div>
        <div className="page-actions">
          <button id="add-customer-btn" className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <div className="search-bar">
          <Search size={16} />
          <input id="customer-search-filter" className="form-input" placeholder="Search by name, GSTIN, phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={28} color="var(--color-text-muted)" /></div>
            <p className="empty-state-title">No customers found</p>
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={openNew}>
              Add First Customer
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>GSTIN</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>State</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{c.gstin || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.billingAddress?.city || '—'}</td>
                    <td>{c.billingAddress?.state || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <Link to={`/invoices?customer=${c._id}`} className="btn btn-ghost btn-sm">
                          <FileText size={14} />
                        </Link>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}
                          onClick={() => setDeleteId(c._id!)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Customer' : 'Add Customer'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Name <span className="required">*</span></label>
                  <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Business or person name" />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input className="form-input" value={form.gstin || ''} onChange={e => setField('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone || ''} onChange={e => setField('phone', e.target.value)} placeholder="9876543210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email || ''} onChange={e => setField('email', e.target.value)} placeholder="customer@email.com" />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Billing Address</label>
                <div className="form-grid form-grid-2" style={{ gap: 'var(--space-3)' }}>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <input className="form-input" value={form.billingAddress.line1} onChange={e => setBillingField('line1', e.target.value)} placeholder="Address Line 1 *" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <input className="form-input" value={form.billingAddress.line2 || ''} onChange={e => setBillingField('line2', e.target.value)} placeholder="Address Line 2 (optional)" />
                  </div>
                  <div className="form-group">
                    <input className="form-input" value={form.billingAddress.city} onChange={e => setBillingField('city', e.target.value)} placeholder="City *" />
                  </div>
                  <div className="form-group">
                    <input className="form-input" value={form.billingAddress.pincode} onChange={e => setBillingField('pincode', e.target.value)} placeholder="Pincode" maxLength={6} />
                  </div>
                  <div className="form-group">
                    <select className="form-select" value={form.billingAddress.state} onChange={e => handleStateChange(e.target.value)}>
                      {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <input className="form-input" value={form.billingAddress.stateCode} readOnly placeholder="State Code" style={{ opacity: 0.7 }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Delete Customer</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--color-text-secondary)' }}>Are you sure? This will not delete existing invoices for this customer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
