import React from 'react';
import { ArrowRight, Download, Eye } from 'lucide-react';

export interface SampleItem {
  key: string;
  title: string;
  filename: string;
  description: string;
  category: string;
}

interface SampleCardProps {
  sample: SampleItem;
  onSelectSample: (key: string) => void;
  isLoading: boolean;
}

export const SampleCard: React.FC<SampleCardProps> = ({ sample, onSelectSample, isLoading }) => {
  const pdfUrl = `/samples/${sample.filename}`;

  return (
    <div className="sample-card">
      <div>
        <div className="sample-category">{sample.category}</div>
        <h4 className="sample-title">{sample.title}</h4>
        <p className="sample-desc">{sample.description}</p>
      </div>

      <div className="sample-actions">
        <button
          className="btn-primary"
          onClick={() => onSelectSample(sample.key)}
          disabled={isLoading}
          aria-label={`Try sample ${sample.title}`}
        >
          <span>Try Sample</span>
          <ArrowRight size={14} />
        </button>

        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          title="Inspect and download source PDF"
        >
          <Download size={13} />
          <span>Inspect PDF</span>
        </a>
      </div>
    </div>
  );
};
