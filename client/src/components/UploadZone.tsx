import React, { useState, useRef } from 'react';
import { UploadCloud, AlertTriangle } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelected, isUploading }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProceed = (file: File) => {
    setErrorMessage(null);
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Unsupported file format. Please upload a PDF, JPEG, or PNG document.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File exceeds the 20MB limit. Please upload a smaller document.');
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProceed(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProceed(e.target.files[0]);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        className={`dropzone-container ${isDragActive ? 'is-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload document dropzone"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        <div className="dropzone-icon">
          <UploadCloud size={28} />
        </div>

        <h3 className="dropzone-title">
          {isUploading ? 'Uploading to ephemeral memory...' : 'Drop your document here, or browse files'}
        </h3>
        <p className="dropzone-desc">
          Contracts, lease agreements, circulars, or policy documents. Never stored on disk.
        </p>

        <span className="dropzone-limits">
          PDF, JPG, PNG • Max 20MB • 24h Auto-Expire
        </span>
      </div>

      {errorMessage && (
        <div className="disclaimer-banner" style={{ maxWidth: 640, margin: '-20px auto 30px' }}>
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
