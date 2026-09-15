import React, { useState, useEffect } from 'react';
import { Clock, ArrowRight, Trash2, FileText, AlertCircle } from 'lucide-react';

interface HistoryItem {
  _id: string;
  originalFilename: string;
  fileType: string;
  status: string;
  isSample: boolean;
  createdAt: string;
  expiresAt: string;
}

interface HistoryProps {
  onNavigate: (path: string) => void;
}

export const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const [documents, setDocuments] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents/history');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this document from session history?')) return;

    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const formatTimeRemaining = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffHours = Math.max(0, Math.round((expiresAt - now) / (1000 * 60 * 60)));
    return `${diffHours}h left`;
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
          Session Documents
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
          Past documents analyzed during your current session. All records and chats automatically expire in 24 hours.
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-muted)' }}>
          Loading session documents...
        </div>
      ) : documents.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--paper-card)',
          border: '1px solid var(--margin)',
          borderRadius: 'var(--radius-md)',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'var(--margin-subtle)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-muted)',
            marginBottom: 16
          }}>
            <FileText size={24} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No documents yet</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', maxWidth: 400, margin: '0 auto 20px' }}>
            Upload a document or try one of the three bundled fictional samples on the homepage to start.
          </p>
          <button
            className="btn-primary"
            onClick={() => onNavigate('/')}
          >
            <span>Upload or Try a Sample</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {documents.map((doc) => (
            <div
              key={doc._id}
              onClick={() => onNavigate(`/d/${doc._id}`)}
              style={{
                backgroundColor: 'var(--paper-card)',
                border: '1px solid var(--margin)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'border-color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--margin)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--margin-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink)'
                }}>
                  <FileText size={18} />
                </div>

                <div>
                  <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                    {doc.originalFilename}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: doc.isSample ? 'var(--highlighter-subtle)' : 'var(--verified-subtle)',
                      color: doc.isSample ? 'var(--ink)' : 'var(--verified)'
                    }}>
                      {doc.isSample ? 'Sample' : 'Uploaded'}
                    </span>

                    <span style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      <span>{formatTimeRemaining(doc.expiresAt)}</span>
                    </span>

                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      color: doc.status === 'ready' ? 'var(--verified)' : 'var(--highlighter-hover)'
                    }}>
                      • {doc.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn-secondary"
                  onClick={(e) => handleDelete(doc._id, e)}
                  title="Delete document now"
                  style={{ color: 'var(--flag)' }}
                >
                  <Trash2 size={13} />
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => onNavigate(`/d/${doc._id}`)}
                >
                  <span>Open</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto-expire note */}
      <div className="disclaimer-banner" style={{ marginTop: 24 }}>
        <AlertCircle size={15} />
        <span>
          Strict Privacy Guarantee: Raw documents are never stored on disk. All records in MongoDB are automatically purged after 24 hours by TTL indexes.
        </span>
      </div>
    </div>
  );
};
