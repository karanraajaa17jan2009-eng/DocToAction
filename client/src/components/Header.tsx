import React from 'react';
import { FileText, Clock, Info } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <button 
          className="header-logo" 
          onClick={() => onNavigate('/')} 
          aria-label="Doc-to-Action Home"
        >
          <span className="badge-dot" />
          <span>Doc-to-Action</span>
        </button>

        <nav className="header-nav">
          <button
            className={`nav-link ${currentPath === '/' ? 'active' : ''}`}
            onClick={() => onNavigate('/')}
          >
            <FileText size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            New Document
          </button>
          <button
            className={`nav-link ${currentPath === '/history' ? 'active' : ''}`}
            onClick={() => onNavigate('/history')}
          >
            <Clock size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            History
          </button>
          <button
            className={`nav-link ${currentPath === '/about' ? 'active' : ''}`}
            onClick={() => onNavigate('/about')}
          >
            <Info size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            About
          </button>
        </nav>
      </div>
    </header>
  );
};
