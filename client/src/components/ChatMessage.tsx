import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Globe, ShieldCheck, Mic, Copy, Check } from 'lucide-react';

export interface MessageItem {
  _id: string;
  documentId: string;
  role: 'user' | 'assistant';
  content: string;
  translatedContent?: string;
  isVoice?: boolean;
  createdAt?: string;
}

interface ChatMessageProps {
  message: MessageItem;
  documentId: string;
  onTranslationCached?: (messageId: string, translated: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  documentId,
  onTranslationCached
}) => {
  const [showTamil, setShowTamil] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const [availableVoice, setAvailableVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const isAssistant = message.role === 'assistant';
  const displayContent = (showTamil && message.translatedContent) ? message.translatedContent : message.content;

  // Check device voices for SpeechSynthesis
  useEffect(() => {
    if (!isAssistant) return;

    const checkVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setHasVoiceSupport(false);
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        setHasVoiceSupport(false);
        return;
      }

      // Target language: if in Tamil mode, search for 'ta' / 'ta-IN', otherwise English / general
      const targetLangPrefix = showTamil ? 'ta' : 'en';
      const matching = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(targetLangPrefix));

      if (matching) {
        setHasVoiceSupport(true);
        setAvailableVoice(matching);
      } else if (!showTamil) {
        // Fallback for English to default voice
        const defaultVoice = voices.find(v => v.default) || voices[0];
        setHasVoiceSupport(true);
        setAvailableVoice(defaultVoice);
      } else {
        // No Tamil voice installed on this device
        setHasVoiceSupport(false);
        setAvailableVoice(null);
      }
    };

    checkVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = checkVoices;
    }
  }, [isAssistant, showTamil]);

  // Speech synthesis toggle
  const handleToggleSpeech = () => {
    if (!window.speechSynthesis) return;

    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any currently playing audio

    // Clean markdown symbols for cleaner speech
    const cleanSpeechText = displayContent
      .replace(/\[Clause\s+[^\]]+\]/gi, '')
      .replace(/[*#_`]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    if (availableVoice) {
      utterance.voice = availableVoice;
    }
    utterance.rate = 0.95;

    utterance.onend = () => setIsPlayingVoice(false);
    utterance.onerror = () => setIsPlayingVoice(false);

    setIsPlayingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  // On-demand Tamil translation toggle
  const handleToggleTamil = async () => {
    if (showTamil) {
      setShowTamil(false);
      if (isPlayingVoice) {
        window.speechSynthesis?.cancel();
        setIsPlayingVoice(false);
      }
      return;
    }

    // If already translated and cached
    if (message.translatedContent) {
      setShowTamil(true);
      return;
    }

    // Request translation from server
    setIsTranslating(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message._id,
          targetLang: 'ta'
        })
      });

      if (!res.ok) {
        throw new Error('Failed to translate answer');
      }

      const data = await res.json();
      if (data.translatedContent) {
        message.translatedContent = data.translatedContent;
        if (onTranslationCached) {
          onTranslationCached(message._id, data.translatedContent);
        }
        setShowTamil(true);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={`message-bubble ${message.role}`}>
      {message.role === 'user' && message.isVoice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--highlighter)', marginBottom: 4 }}>
          <Mic size={12} />
          <span>Voice query</span>
        </div>
      )}

      <div style={{ whiteSpace: 'pre-wrap' }}>
        {displayContent}
      </div>

      {isAssistant && (
        <div className="message-actions-bar">
          <span className="verified-badge" title="Information cited from verified document clauses">
            <ShieldCheck size={12} />
            <span>Grounded</span>
          </span>

          {/* Copy answer to clipboard */}
          <button
            type="button"
            className={`msg-action-btn ${isCopied ? 'active' : ''}`}
            onClick={handleCopyAnswer}
            title={isCopied ? 'Copied to clipboard!' : 'Copy answer'}
          >
            {isCopied ? <Check size={12} color="var(--verified)" /> : <Copy size={12} />}
            <span>{isCopied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Spoken Answer Icon: Only shown if matching voice is present on device */}
          {hasVoiceSupport && (
            <button
              type="button"
              className={`msg-action-btn ${isPlayingVoice ? 'active' : ''}`}
              onClick={handleToggleSpeech}
              title={isPlayingVoice ? 'Stop audio reading' : 'Read answer aloud (SpeechSynthesis)'}
              aria-label={isPlayingVoice ? 'Stop audio' : 'Play audio'}
            >
              {isPlayingVoice ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isPlayingVoice ? 'Stop' : 'Listen'}</span>
            </button>
          )}

          {/* Per-answer View in Tamil toggle */}
          <button
            type="button"
            className={`msg-action-btn ${showTamil ? 'active' : ''}`}
            onClick={handleToggleTamil}
            disabled={isTranslating}
            title="Translate this specific answer into Tamil"
          >
            <Globe size={12} />
            <span>
              {isTranslating
                ? 'Translating...'
                : (showTamil ? 'View in English' : 'தமிழில் காண்க')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
