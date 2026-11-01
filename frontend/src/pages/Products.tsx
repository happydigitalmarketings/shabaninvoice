import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { productsApi } from '../api/products.api';
import { UNIT_OPTIONS } from '../types/product.types';
import type { Product } from '../types/product.types';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatCurrency';

const emptyForm = (): Omit<Product, '_id' | 'createdAt' | 'updatedAt'> => ({
  name: '', hsnSac: '19023010', unit: 'PKT', unitPrice: 0,
  cgstRate: 2.5, sgstRate: 2.5, igstRate: 5,
  description: '', isActive: true,
});

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getAll(search || undefined);
      setProducts(res.data || []);
    } catch { toast.error('Could not load products'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ ...p }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    if (!form.hsnSac.trim()) { toast.error('HSN/SAC code is required'); return; }
    try {
      setSaving(true);
      if (editing?._id) {
        await productsApi.update(editing._id, form);
        toast.success('Product updated!');
      } else {
        await productsApi.create(form);
        toast.success('Product added!');
      }
      setShowModal(false);
      fetchProducts();
    } catch { toast.error('Could not save product'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await productsApi.delete(deleteId);
      toast.success('Product deleted');
      setDeleteId(null);
      fetchProducts();
    } catch { toast.error('Could not delete product'); }
  };

  const toggleActive = async (p: Product) => {
    try {
      await productsApi.update(p._id!, { isActive: !p.isActive });
      fetchProducts();
    } catch { toast.error('Could not update product'); }
  };

  const setField = (field: string, value: string | number | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const gstWarning = form.cgstRate + form.sgstRate !== form.igstRate && form.igstRate > 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} products</p>
        </div>
        <div className="page-actions">
          <button id="add-product-btn" className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <div className="search-bar">
          <Search size={16} />
          <input id="product-search" className="form-input" placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Note about GST rates */}
      <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: '#60a5fa' }}>
        ℹ️ <strong>Default tax rate:</strong> HSN 1902 (Noodles/Pasta) — 5% GST = 2.5% CGST + 2.5% SGST. Verify with your CA before issuing invoices. Rates are editable per product.
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Package size={28} color="var(--color-text-muted)" /></div>
            <p className="empty-state-title">No products found</p>
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={openNew}>
              Add First Product
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>HSN/SAC</th>
                  <th>Unit</th>
                  <th>Price (₹)</th>
                  <th>CGST%</th>
                  <th>SGST%</th>
                  <th>IGST%</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id} style={{ opacity: p.isActive ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.hsnSac}</td>
                    <td>{p.unit}</td>
                    <td>{p.unitPrice > 0 ? formatCurrency(p.unitPrice) : <span style={{ color: 'var(--color-warning)' }}>—Set price—</span>}</td>
                    <td>{p.cgstRate}%</td>
                    <td>{p.sgstRate}%</td>
                    <td>{p.igstRate}%</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(p)} title="Toggle active">
                        {p.isActive
                          ? <ToggleRight size={20} color="var(--color-success)" />
                          : <ToggleLeft size={20} color="var(--color-text-muted)" />}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}
                          onClick={() => setDeleteId(p._id!)}>
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
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Product Name <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Moringa Noodles" />
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">HSN / SAC Code <span className="required">*</span></label>
                  <input className="form-input" value={form.hsnSac} onChange={e => setField('hsnSac', e.target.value)} placeholder="19023010" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-select" value={form.unit} onChange={e => setField('unit', e.target.value)}>
                    {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Default Unit Price (₹)</label>
                  <input type="number" className="form-input" value={form.unitPrice} min={0} step={0.01}
                    onChange={e => setField('unitPrice', parseFloat(e.target.value) || 0)} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Can be overridden per invoice. Set 0 to always enter manually.
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>GST Rates</label>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">CGST %</label>
                    <input type="number" className="form-input" value={form.cgstRate} min={0} step={0.5}
                      onChange={e => setField('cgstRate', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SGST %</label>
                    <input type="number" className="form-input" value={form.sgstRate} min={0} step={0.5}
                      onChange={e => setField('sgstRate', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IGST %</label>
                    <input type="number" className="form-input" value={form.igstRate} min={0} step={0.5}
                      onChange={e => setField('igstRate', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                {gstWarning && (
                  <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                    ⚠ CGST + SGST ({form.cgstRate + form.sgstRate}%) ≠ IGST ({form.igstRate}%). Verify with your CA.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="form-textarea" rows={2} value={form.description || ''}
                  onChange={e => setField('description', e.target.value)} placeholder="Optional product description" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Product'}
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
              <h3 className="modal-title">Delete Product</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--color-text-secondary)' }}>Delete this product? Existing invoices will not be affected.</p>
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

export default Products;
