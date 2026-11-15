import React, { useEffect, useState } from 'react';
import { Menu, Bell, DownloadCloud, Sun, Moon } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { promptPwaInstall, subscribeInstallState } from '../../pwa';
import { getInitialTheme, toggleTheme } from '../../utils/theme';
import toast from 'react-hot-toast';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [canInstall, setCanInstall] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme());

  useEffect(() => {
    return subscribeInstallState(setCanInstall);
  }, []);

  const handleInstall = async () => {
    const installed = await promptPwaInstall();
    if (installed) {
      toast.success('App installed successfully!');
    }
  };

  const handleThemeToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

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

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Light / Dark Mode Toggle */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={handleThemeToggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {canInstall && (
          <button
            className="btn btn-primary"
            onClick={handleInstall}
            title="Install STF Billing App"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
            }}
          >
            <DownloadCloud size={16} />
            <span>Install App</span>
          </button>
        )}

        <button className="btn btn-ghost btn-icon" aria-label="Notifications">
          <Bell size={18} />
        </button>

        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {user?.name?.charAt(0).toUpperCase() || 'A'}
        </div>
      </div>
    </header>
  );
};

export default Header;
