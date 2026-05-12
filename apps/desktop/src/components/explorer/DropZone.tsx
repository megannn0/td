import React, { useState } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
}

const DropZone: React.FC<DropZoneProps> = ({ onFiles, children }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files: File[] = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      className="relative h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{
            background: 'rgba(0, 97, 255, 0.05)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl"
            style={{
              background: 'var(--db-white)',
              border: '2px dashed var(--db-blue)',
              boxShadow: 'var(--db-shadow-lg)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--db-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div className="text-sm font-medium" style={{ color: 'var(--db-blue)' }}>
              Drop files to upload
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropZone;