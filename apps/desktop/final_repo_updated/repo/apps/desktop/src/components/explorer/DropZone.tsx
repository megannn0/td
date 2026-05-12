import React, { useState } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
}

/**
 * A wrapper that adds drag‑and‑drop file upload capabilities. When files
 * are dragged over the area an overlay appears. Dropped files are
 * passed to the `onFiles` callback. The wrapper does not prevent
 * default click behaviour and can be used in conjunction with other
 * interactive elements.
 */
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
    if (files.length > 0) {
      onFiles(files);
    }
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
        <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-blue-400 bg-blue-50/75 z-10">
          <div className="text-blue-700 font-medium">Drop files to upload</div>
        </div>
      )}
    </div>
  );
};

export default DropZone;
