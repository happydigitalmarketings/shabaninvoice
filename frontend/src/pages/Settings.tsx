import React, { useState } from 'react';
import { Save, Building, CreditCard, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const defaultSettings = {
  businessName: 'SHABAN TRADITIONAL FOODS',
  addressLine1: '44, Sengottaiah Colony',
  addressLine2: 'Saradha Mill Road, Sundarapuram',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  stateCode: '33',
  pincode: '641024',
  mobile: '9585949146',
  email: 'shabantrendsofficial@gmail.com',
  gstin: '33BBFPA5813G1Z7',
  accountName: 'Abeetha Banu',
  accountNumber: '1239101130564',
  ifsc: 'CNRB0001239',
  bankName: 'Canara Bank',
  branch: 'Sundarapuram',
  upiId: 'abeethabanun@oksbi',
  invoicePrefix: 'STF',
  terms: [
    'Goods once sold will not be taken back or exchanged.',
    'All disputes are subject to Coimbatore jurisdiction.',
    'Payment due as per agreed terms.',
    'This is a computer generated invoice.',
  ].join('\n'),
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({ ...defaultSettings });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'bank' | 'invoice'>('business');
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const setField = (field: string, value: string) =>
    setSettings(s => ({ ...s, [field]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      await axiosClient.put('/settings', settings);
      toast.success('Settings saved!');
    } catch {
      toast.error('Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async () => {
    if (!pwForm.current || !pwForm.newPw) { toast.error('Fill in all password fields'); return; }
    if (pwForm.newPw !== pwForm.confirm)   { toast.error('New passwords do not match'); return; }
    if (pwForm.newPw.length < 8)           { toast.error('Password must be at least 8 characters'); return; }
    try {
      setPwSaving(true);
      await axiosClient.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success('Password changed!');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch {
      toast.error('Could not change password. Check current password.');
    } finally {
      setPwSaving(false);
    }
  };

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building },
    { id: 'bank',     label: 'Bank & UPI',    icon: CreditCard },
    { id: 'invoice',  label: 'Invoice',        icon: FileText },
  ] as const;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your business information and invoice defaults</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`btn ${activeTab === id ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Business Info */}
      {activeTab === 'business' && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">Business Information</h2></div>
          <div className="form-grid form-grid-2" style={{ gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Business Name</label>
              <input className="form-input" value={settings.businessName} onChange={e => setField('businessName', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Address Line 1</label>
              <input className="form-input" value={settings.addressLine1} onChange={e => setField('addressLine1', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Address Line 2</label>
              <input className="form-input" value={settings.addressLine2} onChange={e => setField('addressLine2', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={settings.city} onChange={e => setField('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input className="form-input" value={settings.pincode} onChange={e => setField('pincode', e.target.value)} maxLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-input" value={settings.state} onChange={e => setField('state', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">State Code</label>
              <input className="form-input" value={settings.stateCode} onChange={e => setField('stateCode', e.target.value)} maxLength={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile</label>
              <input className="form-input" value={settings.mobile} onChange={e => setField('mobile', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={settings.email} onChange={e => setField('email', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">GSTIN</label>
              <input className="form-input" value={settings.gstin} onChange={e => setField('gstin', e.target.value.toUpperCase())} maxLength={15} />
            </div>
          </div>
        </div>
      )}

      {/* Bank */}
      {activeTab === 'bank' && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">Bank & UPI Details</h2></div>
          <div className="form-grid form-grid-2" style={{ gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input className="form-input" value={settings.accountName} onChange={e => setField('accountName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input className="form-input" value={settings.accountNumber} onChange={e => setField('accountNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input className="form-input" value={settings.ifsc} onChange={e => setField('ifsc', e.target.value.toUpperCase())} />
            </div>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input className="form-input" value={settings.bankName} onChange={e => setField('bankName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Branch</label>
              <input className="form-input" value={settings.branch} onChange={e => setField('branch', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">UPI ID</label>
              <input className="form-input" value={settings.upiId} onChange={e => setField('upiId', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Invoice Settings */}
      {activeTab === 'invoice' && (
        <>
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card-header"><h2 className="card-title">Invoice Preferences</h2></div>
            <div className="form-grid form-grid-2" style={{ gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Invoice Number Prefix</label>
                <input className="form-input" value={settings.invoicePrefix} onChange={e => setField('invoicePrefix', e.target.value.toUpperCase())} maxLength={5} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Generates: {settings.invoicePrefix}001, {settings.invoicePrefix}002, ...
                </span>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Terms &amp; Conditions</label>
              <textarea className="form-textarea" rows={5} value={settings.terms} onChange={e => setField('terms', e.target.value)} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>One condition per line.</span>
            </div>
          </div>

          {/* Change Password */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Change Password</h2></div>
            <div className="form-grid form-grid-2" style={{ gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <button className="btn btn-secondary" onClick={handleChangePw} disabled={pwSaving}>
                {pwSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Settings;
