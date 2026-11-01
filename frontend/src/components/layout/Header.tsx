import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick }) => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="btn btn-ghost btn-icon"
          onClick={onMenuClick}
          aria-label="Open menu"
          style={{ display: 'none' }}
          id="menu-toggle"
        >
          <Menu size={20} />
        </button>

        <button
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right">
        <button className="btn btn-ghost btn-icon" aria-label="Notifications">
          <Bell size={18} />
        </button>

        <div style={{
          width: 36, height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: 'white',
          cursor: 'pointer',
        }}>
          {user?.name?.charAt(0).toUpperCase() || 'A'}
        </div>
      </div>
    </header>
  );
};

export default Header;
