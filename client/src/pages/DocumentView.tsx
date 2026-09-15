import React, { useState, useEffect, useRef } from 'react';
import { KeyPointsChips } from '../components/KeyPointsChips';
import { ChatMessage, MessageItem } from '../components/ChatMessage';
import { VoiceRecorder } from '../components/VoiceRecorder';
import {
  Download,
  Trash2,
  Globe,
  Send,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  Copy,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface DocumentRecord {
  _id: string;
  originalFilename: string;
  fileType: string;
  status: 'uploading' | 'reading' | 'writing' | 'ready' | 'error';
  statusMessage?: string;
  isSample: boolean;
  sampleKey?: string;
  createdAt: string;
  expiresAt: string;
}

interface SummaryData {
  summaryText: string;
  translatedSummary?: string;
  keyPoints: {
    eligibility: string[];
    obligations: string[];
    deadlines: string[];
  };
  translatedKeyPoints?: {
    eligibility: string[];
    obligations: string[];
    deadlines: string[];
  };
}

interface DocumentViewProps {
  documentId: string;
  onNavigate: (path: string) => void;
}

export const DocumentView: React.FC<DocumentViewProps> = ({ documentId, onNavigate }) => {
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [status, setStatus] = useState<string>('uploading');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing document analysis...');
  const [isTamilSummary, setIsTamilSummary] = useState(false);
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false);
  const [isSummaryCopied, setIsSummaryCopied] = useState(false);

  const [questionInput, setQuestionInput] = useState('');
  const [isStreamingChat, setIsStreamingChat] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Copy structured summary to clipboard
  const handleCopySummary = async () => {
    if (!summary) return;
    const sumText = (isTamilSummary && summary.translatedSummary) ? summary.translatedSummary : summary.summaryText;
    const kPoints = (isTamilSummary && summary.translatedKeyPoints) ? summary.translatedKeyPoints : summary.keyPoints;

    let textToCopy = `Document: ${doc?.originalFilename || 'Document'}\n\n`;
    textToCopy += `Summary:\n${sumText}\n\n`;

    if (kPoints?.eligibility?.length) {
      textToCopy += `Eligibility Criteria:\n${kPoints.eligibility.map(p => `• ${p}`).join('\n')}\n\n`;
    }
    if (kPoints?.obligations?.length) {
      textToCopy += `Obligations & Rules:\n${kPoints.obligations.map(p => `• ${p}`).join('\n')}\n\n`;
    }
    if (kPoints?.deadlines?.length) {
      textToCopy += `Deadlines & Timelines:\n${kPoints.deadlines.map(p => `• ${p}`).join('\n')}\n\n`;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsSummaryCopied(true);
      setTimeout(() => setIsSummaryCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  // Clear chat conversation
  const handleClearChat = async () => {
    if (messages.length === 0) return;
    if (!confirm('Clear all chat messages for this document?')) return;
    try {
      await fetch(`/api/documents/${documentId}/messages`, { method: 'DELETE' });
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  // Suggested questions based on document
  const getSuggestedQuestions = (): string[] => {
    if (doc?.sampleKey === 'solar') {
      return [
        'What is the maximum subsidy percentage and cap?',
        'What are the roof space requirements?',
        'What is the deadline for application?'
      ];
    }
    if (doc?.sampleKey === 'lease') {
      return [
        'What is the notice period and lock-in period?',
        'Under what conditions is the deposit refunded?',
        'Who pays for maintenance and minor repairs?'
      ];
    }
    if (doc?.sampleKey === 'tos') {
      return [
        'What is the SLA uptime guarantee and credit policy?',
        'What are the liability limits and caps?',
        'How can either party terminate the contract?'
      ];
    }
    return [
      'What are the key deadlines mentioned?',
      'What are my primary obligations or restrictions?',
      'Are there penalties, fees, or refund terms?'
    ];
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Fetch document details and messages
  const loadDocumentDetails = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) throw new Error('Document not found or expired');
      const data = await res.json();
      setDoc(data.document);
      setStatus(data.document.status);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.error('Error loading doc details:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadDocumentDetails();
    loadMessages();
  }, [documentId]);

  // Real-time SSE Status Stream
  useEffect(() => {
    if (status === 'ready' || status === 'error') return;

    const eventSource = new EventSource(`/api/documents/${documentId}/status`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) {
          setStatus(data.status);
          setStatusMessage(data.statusMessage || '');
        }

        if (data.status === 'ready') {
          eventSource.close();
          loadDocumentDetails();
        } else if (data.status === 'error') {
          eventSource.close();
        }
      } catch (e) {
        console.error('Error parsing SSE status:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [documentId, status]);

  // Toggle Tamil Translation for Summary & Key Points
  const handleToggleSummaryTamil = async () => {
    if (isTamilSummary) {
      setIsTamilSummary(false);
      return;
    }

    if (summary?.translatedSummary) {
      setIsTamilSummary(true);
      return;
    }

    setIsTranslatingSummary(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSummary: true, targetLang: 'ta' })
      });

      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();

      setSummary(prev => prev ? {
        ...prev,
        translatedSummary: data.translatedSummary,
        translatedKeyPoints: data.translatedKeyPoints
      } : null);

      setIsTamilSummary(true);
    } catch (err) {
      console.error('Failed to translate summary:', err);
      alert('Could not translate summary into Tamil right now.');
    } finally {
      setIsTranslatingSummary(false);
    }
  };

  // Ask typed question
  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || isStreamingChat) return;

    const questionText = questionInput.trim();
    setQuestionInput('');
    await executeChatQuery(questionText);
  };

  // Ask voice question
  const handleVoiceAudioReady = async (audioBlob: Blob) => {
    if (isStreamingChat) return;
    await executeChatQuery(undefined, audioBlob);
  };

  // Core Chat Execution (handles typed text or audio)
  const executeChatQuery = async (text?: string, audioBlob?: Blob) => {
    setIsStreamingChat(true);
    setStreamingContent('');

    try {
      let body: any;
      const headers: Record<string, string> = {};

      if (audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice-query.webm');
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ content: text });
      }

      const response = await fetch(`/api/documents/${documentId}/messages`, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Chat request failed');
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let partialAnswer = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              const dataStr = line.replace('data:', '').trim();
              if (!dataStr) continue;

              try {
                const parsed = JSON.parse(dataStr);

                if (currentEvent === 'transcription') {
                  // Add transcribed question to UI immediately
                  setMessages(prev => [
                    ...prev,
                    {
                      _id: parsed.messageId,
                      documentId,
                      role: 'user',
                      content: parsed.question,
                      isVoice: true
                    }
                  ]);
                } else if (currentEvent === 'chunk') {
                  partialAnswer += parsed.text;
                  setStreamingContent(partialAnswer);
                } else if (currentEvent === 'done') {
                  // Finalized response
                  await loadMessages();
                  setStreamingContent('');
                }
              } catch (parseErr) {
                console.warn('SSE chunk parse error:', parseErr);
              }
            }
          }
        }
      }

      await loadMessages();
    } catch (err: any) {
      console.error('Error during chat query:', err);
      alert(`Chat error: ${err.message}`);
    } finally {
      setIsStreamingChat(false);
      setStreamingContent('');
    }
  };

  // Delete Document
  const handleDeleteDocument = async () => {
    if (!confirm('Permanently delete this document and all chat history?')) return;
    try {
      await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      onNavigate('/history');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="doc-view-container">
      {/* Top Bar Navigation & Actions */}
      <div className="doc-top-bar">
        <div className="doc-meta">
          <button
            onClick={() => onNavigate('/')}
            className="btn-secondary"
            style={{ padding: '6px 10px' }}
            title="Back to home"
          >
            <ArrowLeft size={15} />
          </button>

          <div>
            <h2 className="doc-name">{doc?.originalFilename || 'Document Analysis'}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span className="doc-badge">
                {doc?.isSample ? 'Bundled Sample' : 'User Upload'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                <span>Auto-expires in 24h</span>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href={`/api/documents/${documentId}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            title="Inspect and download source document PDF"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </a>

          <button
            onClick={handleDeleteDocument}
            className="btn-secondary"
            style={{ color: 'var(--flag)', borderColor: 'var(--margin)' }}
            title="Delete document and chat from database immediately"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* SSE Real-Time Processing Status Bar (shown while processing) */}
      {status !== 'ready' && (
        <div className="status-tracker">
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
              Analyzing Document
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
              {statusMessage}
            </p>
          </div>

          <div className="status-steps-row">
            <div className="status-step-item">
              <div className={`step-indicator ${status === 'uploading' ? 'active' : (status !== 'error' ? 'done' : '')}`}>
                {status !== 'uploading' && status !== 'error' ? <CheckCircle size={16} /> : '1'}
              </div>
              <span className="step-label">Uploading</span>
            </div>

            <div className="status-step-item">
              <div className={`step-indicator ${status === 'reading' ? 'active' : (status === 'writing' || status === 'ready' ? 'done' : '')}`}>
                {status === 'writing' || status === 'ready' ? <CheckCircle size={16} /> : '2'}
              </div>
              <span className="step-label">Reading Document</span>
            </div>

            <div className="status-step-item">
              <div className={`step-indicator ${status === 'writing' ? 'active' : (status === 'ready' ? 'done' : '')}`}>
                {status === 'ready' ? <CheckCircle size={16} /> : '3'}
              </div>
              <span className="step-label">Synthesizing Summary</span>
            </div>

            <div className="status-step-item">
              <div className={`step-indicator ${status === 'ready' ? 'done' : ''}`}>
                {status === 'ready' ? <CheckCircle size={16} /> : '4'}
              </div>
              <span className="step-label">Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* Two Distinct Surfaces: Summary & Chat */}
      {status === 'ready' && (
        <div className="doc-split-layout">
          {/* Surface 1: Document Summary & Key-Points (Literary Serif Surface) */}
          <div className="summary-surface">
            <div className="summary-header">
              <div className="summary-title">
                {isTamilSummary ? 'ஆவண சுருக்கம் & விதிமுறைகள்' : 'Document Summary & Key Clauses'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Copy Summary Button */}
                <button
                  type="button"
                  className={`tamil-toggle-btn ${isSummaryCopied ? 'is-active' : ''}`}
                  onClick={handleCopySummary}
                  title="Copy summary and key points to clipboard"
                >
                  {isSummaryCopied ? <Check size={13} color="var(--verified)" /> : <Copy size={13} />}
                  <span>{isSummaryCopied ? 'Copied!' : 'Copy'}</span>
                </button>

                {/* Quiet View in Tamil toggle */}
                <button
                  type="button"
                  className={`tamil-toggle-btn ${isTamilSummary ? 'is-active' : ''}`}
                  onClick={handleToggleSummaryTamil}
                  disabled={isTranslatingSummary}
                  title="Translate document summary into Tamil"
                >
                  <Globe size={13} />
                  <span>
                    {isTranslatingSummary
                      ? 'மொழிபெயர்க்கப்படுகிறது...'
                      : (isTamilSummary ? 'View in English' : 'தமிழில் காண்க')}
                  </span>
                </button>
              </div>
            </div>

            <div className="summary-body">
              {((isTamilSummary && summary?.translatedSummary) ? summary.translatedSummary : summary?.summaryText)
                ?.split('\n\n')
                .map((para, i) => (
                  <p key={i}>{para}</p>
                )) || (
                  <p style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>
                    Summary analysis in progress...
                  </p>
                )}
            </div>

            {/* Key-Points structured chips */}
            {summary && (
              <KeyPointsChips
                keyPoints={summary.keyPoints}
                translatedKeyPoints={summary.translatedKeyPoints}
                isTamil={isTamilSummary}
              />
            )}

            {/* Mandatory Disclaimers */}
            <div className="disclaimer-banner">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>
                {isTamilSummary
                  ? 'AI-ஆல் உருவாக்கப்பட்டது — நம்புவதற்கு முன் சரிபார்க்கவும். இது சட்ட அல்லது நிதி ஆலோசனை அல்ல.'
                  : 'AI-generated — verify before relying on it. Not legal, medical, or financial advice.'}
              </span>
            </div>
          </div>

          {/* Surface 2: Grounded Chat Panel (Modern App Surface) */}
          <div className="chat-surface">
            <div className="chat-header">
              <div className="chat-title">Ask Questions</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="btn-secondary"
                    style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title="Clear conversation history"
                  >
                    <RotateCcw size={11} />
                    <span>Clear</span>
                  </button>
                )}
                <div className="verified-badge">
                  <ShieldCheck size={13} />
                  <span>Grounded in document</span>
                </div>
              </div>
            </div>

            <div className="chat-messages-area">
              {messages.length === 0 && !streamingContent && (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--ink-muted)',
                  fontSize: 13,
                  marginTop: 'auto',
                  marginBottom: 'auto',
                  padding: 20
                }}>
                  <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    No questions asked yet
                  </p>
                  <p>
                    Type any question about clauses, penalties, or deadlines, tap the microphone to speak, or select a suggested question below.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessage
                  key={msg._id}
                  message={msg}
                  documentId={documentId}
                />
              ))}

              {/* Live Streaming Assistant Message */}
              {streamingContent && (
                <div className="message-bubble assistant">
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {streamingContent}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--verified)', marginTop: 8 }}>
                    <span className="badge-dot" style={{ width: 6, height: 6, backgroundColor: 'var(--verified)' }} />
                    <span>Streaming verified clauses...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Clickable Suggested Questions */}
            <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid var(--margin-subtle)', backgroundColor: 'var(--paper-panel)' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, width: '100%', marginBottom: 2 }}>
                <Sparkles size={11} color="var(--highlighter)" />
                <span>Suggested questions:</span>
              </span>
              {getSuggestedQuestions().map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!isStreamingChat) {
                      executeChatQuery(q);
                    }
                  }}
                  disabled={isStreamingChat}
                  style={{
                    fontSize: 11.5,
                    padding: '4px 9px',
                    backgroundColor: 'var(--paper-card)',
                    border: '1px solid var(--margin)',
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--ink)',
                    cursor: isStreamingChat ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isStreamingChat) {
                      e.currentTarget.style.borderColor = 'var(--highlighter)';
                      e.currentTarget.style.backgroundColor = 'var(--highlighter-subtle)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--margin)';
                    e.currentTarget.style.backgroundColor = 'var(--paper-card)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Input with Voice & Send */}
            <div className="chat-input-bar">
              <form onSubmit={handleSendQuestion} className="chat-form">
                <input
                  type="text"
                  className="chat-text-input"
                  placeholder="Ask a question about this document..."
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  disabled={isStreamingChat}
                />

                {/* Voice Recorder button */}
                <VoiceRecorder
                  onAudioReady={handleVoiceAudioReady}
                  disabled={isStreamingChat}
                />

                <button
                  type="submit"
                  className="send-btn"
                  disabled={isStreamingChat || !questionInput.trim()}
                  title="Send question"
                  aria-label="Send question"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
