import React from 'react';
import { ShieldCheck, Lock, Clock, Mic, Globe, Info, AlertTriangle } from 'lucide-react';

interface AboutProps {
  onNavigate: (path: string) => void;
}

export const About: React.FC<AboutProps> = ({ onNavigate }) => {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', lineHeight: 1.7 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
          About Doc-to-Action
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: 16 }}>
          A document summarizer and grounded conversational assistant designed for dense paperwork.
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--paper-card)',
        border: '1px solid var(--margin)',
        borderRadius: 'var(--radius-md)',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, marginBottom: 10, color: 'var(--ink)' }}>
            What This Is
          </h2>
          <p style={{ color: 'var(--ink)', fontSize: 14.5 }}>
            Doc-to-Action reads contracts, residential lease agreements, government scheme circulars, insurance policies, and terms of service. It synthesizes them into plain human language and extracts critical clauses into structured categories: <strong>Eligibility Criteria</strong>, <strong>Obligations & Rules</strong>, and <strong>Deadlines & Timelines</strong>.
          </p>
        </div>

        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, marginBottom: 10, color: 'var(--ink)' }}>
            What This Isn't
          </h2>
          <p style={{ color: 'var(--ink)', fontSize: 14.5 }}>
            Doc-to-Action is an AI-assisted reading tool, not a licensed attorney, medical practitioner, or certified financial advisor. All outputs are AI-generated and should be verified against original source documents before entering binding legal agreements or relying on statutory claims.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--margin)' }} />

        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, marginBottom: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={18} color="var(--verified)" />
            <span>Zero-Disk Storage & Data Ephemerality</span>
          </h2>
          <p style={{ color: 'var(--ink)', fontSize: 14.5, marginBottom: 12 }}>
            We implement strict data minimization:
          </p>
          <ul style={{ paddingLeft: 20, fontSize: 14, color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>
              <strong>No Disk Persistence:</strong> Uploaded PDF files, images, and voice audio recordings are held strictly in server RAM during the active request and are discarded from scope immediately after processing. No copies are ever saved to local hard drives or persistent cloud buckets.
            </li>
            <li>
              <strong>24-Hour MongoDB TTL:</strong> Session documents, summaries, and chat histories are indexed with MongoDB Time-To-Live (TTL) constraints that permanently purge all records after 24 hours.
            </li>
            <li>
              <strong>Anonymous Sessions:</strong> No user registration or account creation is required. Sessions are identified by an anonymous <code>httpOnly</code> cookie.
            </li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, marginBottom: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mic size={18} color="var(--highlighter)" />
            <span>Voice Queries & Spoken Read-Aloud</span>
          </h2>
          <p style={{ color: 'var(--ink)', fontSize: 14.5 }}>
            Users can ask questions by tapping the microphone button. Spoken audio is recorded directly via the browser's <code>MediaRecorder</code> API and processed in-memory by Gemini to transcribe and answer. For spoken answers, Doc-to-Action uses your device's built-in <code>SpeechSynthesis</code> API without sending audio back to third-party text-to-speech providers.
          </p>
        </div>

        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, marginBottom: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} color="var(--highlighter)" />
            <span>On-Demand Tamil Translation</span>
          </h2>
          <p style={{ color: 'var(--ink)', fontSize: 14.5 }}>
            Both document summaries and individual chat responses can be toggled into Tamil with one click. Translations are requested from Gemini, preserve exact clause citations, and are cached on the document record so re-toggling incurs zero extra API calls.
          </p>
        </div>

        <div style={{
          backgroundColor: 'var(--flag-subtle)',
          border: '1px solid var(--margin)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} color="var(--flag)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--ink)' }}>
            <strong>Gemini Model Disclosure:</strong> This deployment connects to Google's Gemini Flash model. In Google AI Studio free tier, content may be processed by Google to improve services. The three bundled sample documents in this app are entirely fictional and safe for free tier testing. For sensitive proprietary documents in enterprise settings, we recommend switching to an enterprise paid Gemini tier with data exclusion guarantees.
          </div>
        </div>
      </div>
    </div>
  );
};
