import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Plus, Users, Package,
  BarChart3, Settings, LogOut, ChefHat,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText,        label: 'Invoices' },
  { to: '/invoices/new', icon: Plus,        label: 'New Invoice' },
  { to: '/customers',icon: Users,           label: 'Customers' },
  { to: '/products', icon: Package,         label: 'Products' },
  { to: '/reports',  icon: BarChart3,       label: 'Reports' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99, background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <ChefHat size={20} color="white" />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Shaban Foods</span>
            <span className="sidebar-brand-tagline">Billing System</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="nav-section-title">Menu</span>

          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="nav-item btn-ghost" style={{ width: '100%' }} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
