import React, { useState, useEffect } from 'react';
import { UploadZone } from '../components/UploadZone';
import { SampleCard, SampleItem } from '../components/SampleCard';
import { Sparkles, ShieldCheck, Zap, Lock, Mic, Globe, AlertCircle } from 'lucide-react';

interface HomeProps {
  onNavigate: (path: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/documents/samples')
      .then(res => res.json())
      .then(data => {
        if (data.samples) setSamples(data.samples);
      })
      .catch(err => console.error('Failed to load sample documents:', err));
  }, []);

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      if (data.documentId) {
        onNavigate(`/d/${data.documentId}`);
      }
    } catch (err: any) {
      alert(`Error uploading document: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleSelectSample = async (sampleKey: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleKey })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Sample initialization failed');
      }

      const data = await res.json();
      if (data.documentId) {
        onNavigate(`/d/${data.documentId}`);
      }
    } catch (err: any) {
      alert(`Error loading sample: ${err.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-tagline">
          Dense paperwork in.<br />Plain answers out.
        </h1>
        <p className="hero-sub">
          Upload contracts, lease agreements, government circulars, or terms of service.
          Get plain-language summaries and ask questions with clause-level verification.
        </p>

        {/* Upload Dropzone */}
        <UploadZone
          onFileSelected={handleFileSelected}
          isUploading={isProcessing}
        />
      </section>

      {/* Try a Sample Section */}
      <section className="samples-section">
        <div className="section-label">
          <Sparkles size={14} color="var(--highlighter)" />
          <span>Or try a realistic sample document</span>
        </div>

        <div className="sample-cards-grid">
          {samples.map((sample) => (
            <SampleCard
              key={sample.key}
              sample={sample}
              onSelectSample={handleSelectSample}
              isLoading={isProcessing}
            />
          ))}
        </div>
      </section>

      {/* Trust & Privacy Pillars */}
      <section style={{
        maxWidth: 960,
        margin: '0 auto 40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16
      }}>
        <div style={{
          backgroundColor: 'var(--paper-card)',
          border: '1px solid var(--margin)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <Lock size={18} color="var(--verified)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Zero Disk Storage</h4>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
              Uploaded files exist strictly in ephemeral server memory during analysis and are never written to disk.
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--paper-card)',
          border: '1px solid var(--margin)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <ShieldCheck size={18} color="var(--verified)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>24-Hour Expiration</h4>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
              MongoDB TTL indexes automatically purge all summaries, chats, and records after 24 hours.
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--paper-card)',
          border: '1px solid var(--margin)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <Mic size={18} color="var(--highlighter)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Voice Input & Spoken Answers</h4>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
              Speak your questions naturally using your browser microphone and listen to grounded answers.
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--paper-card)',
          border: '1px solid var(--margin)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <Globe size={18} color="var(--highlighter)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Tamil Translation</h4>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
              On-demand translation of summaries and individual chat answers into Tamil with MongoDB caching.
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer Line */}
      <div style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '12px 16px',
        backgroundColor: 'var(--paper-card)',
        border: '1px solid var(--margin)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--flag)',
        fontSize: 12.5,
        fontWeight: 500
      }}>
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>
          AI-generated — verify before relying on it. Not legal, medical, or financial advice.
        </span>
      </div>
    </div>
  );
};
