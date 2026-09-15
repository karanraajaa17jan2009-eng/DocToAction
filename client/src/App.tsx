import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { DocumentView } from './pages/DocumentView';
import { History } from './pages/History';
import { About } from './pages/About';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // Route matching
  let pageContent: React.ReactNode = null;
  if (currentPath.startsWith('/d/')) {
    const docId = currentPath.replace('/d/', '').split('/')[0];
    pageContent = <DocumentView documentId={docId} onNavigate={navigate} />;
  } else if (currentPath === '/history') {
    pageContent = <History onNavigate={navigate} />;
  } else if (currentPath === '/about') {
    pageContent = <About onNavigate={navigate} />;
  } else {
    pageContent = <Home onNavigate={navigate} />;
  }

  return (
    <div className="app-container">
      <Header currentPath={currentPath} onNavigate={navigate} />
      <main className="main-content">
        {pageContent}
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
};
