import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FooterProps {
  onNavigate?: (path: string) => void;
  isTamil?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isTamil = false }) => {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-disclaimer">
          <AlertCircle size={15} />
          <span>
            {isTamil
              ? 'AI-ஆல் உருவாக்கப்பட்டது — நம்புவதற்கு முன் சரிபார்க்கவும்.'
              : 'AI-generated — verify before relying on it.'}
          </span>
        </div>

        <div>
          <span>
            {isTamil
              ? 'இது சட்ட, மருத்துவ அல்லது நிதி ஆலோசனை அல்ல. கோப்புகள் 24 மணிநேரத்தில் காலாவதியாகும்.'
              : 'Not legal, medical, or financial advice. Documents auto-expire in 24 hours.'}
          </span>
        </div>

        {onNavigate && (
          <div>
            <button
              onClick={() => onNavigate('/about')}
              style={{ color: 'var(--ink-muted)', textDecoration: 'underline', fontSize: '12px' }}
            >
              Privacy & About
            </button>
          </div>
        )}
      </div>
    </footer>
  );
};
