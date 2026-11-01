import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, Users, BarChart3 } from 'lucide-react';

const mobileNavItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText,        label: 'Invoices' },
  { to: '/invoices/new', icon: Plus,        label: 'New' },
  { to: '/customers',icon: Users,           label: 'Customers' },
  { to: '/reports',  icon: BarChart3,       label: 'Reports' },
];

const MobileNav: React.FC = () => {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {mobileNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
