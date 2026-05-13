import React from 'react';
import ReactDOM from 'react-dom';
import VideoPlayer from './VideoPlayer';
import { getStreamUrl } from '../../api/files';
import type { File as AppFile } from '../../types/file';

interface FilePreviewModalProps {
  file: AppFile;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const streamUrl = getStreamUrl(file.id);
  const isImage = file.mime_type?.startsWith('image/');
  const isVideo = file.mime_type?.startsWith('video/');
  const isAudio = file.mime_type?.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';
  const isText = file.mime_type?.startsWith('text/');
  const canPreview = isImage || isVideo || isAudio || isPdf || isText;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--fluent-bg-card, #fff)',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: canPreview ? 'auto' : 400,
          minWidth: 360,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--fluent-border, #e0e0e0)' }}
        >
          <h3
            className="text-sm font-semibold truncate mr-4"
            style={{ color: 'var(--fluent-text, #111)' }}
          >
            {file.name}
          </h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition"
            style={{ width: 28, height: 28, color: 'var(--fluent-text, #111)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 flex items-center justify-center p-4" style={{ maxHeight: '80vh' }}>
          {isImage && (
            <img
              src={streamUrl}
              alt={file.name}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
          {isVideo && (
            <div style={{ width: '100%', maxWidth: 800 }}>
              <VideoPlayer src={streamUrl} fileId={file.id} />
            </div>
          )}
          {isAudio && (
            <div className="w-full max-w-md p-4">
              <div className="text-center mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--fluent-accent, #0078d4)" strokeWidth="1.5" className="mx-auto mb-2">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                <div className="text-sm" style={{ color: 'var(--fluent-text-secondary)' }}>{file.name}</div>
              </div>
              <audio controls src={streamUrl} className="w-full" autoPlay />
            </div>
          )}
          {isPdf && (
            <iframe src={streamUrl} className="w-full rounded" style={{ height: '70vh', minWidth: 600 }} title={file.name} />
          )}
          {isText && (
            <iframe src={streamUrl} className="w-full rounded" style={{ height: '70vh', minWidth: 500, background: '#fff' }} title={file.name} />
          )}
          {!canPreview && (
            <div className="text-center py-8 space-y-3">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--fluent-text-secondary, #888)" strokeWidth="1.5" className="mx-auto">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <div className="text-sm" style={{ color: 'var(--fluent-text, #111)' }}>
                Preview not available for this file type.
              </div>
              <div className="text-xs" style={{ color: 'var(--fluent-text-secondary, #888)' }}>
                {file.mime_type || 'Unknown type'} &middot; {formatSize(file.size)}
              </div>
              <button
                onClick={() => window.open(streamUrl, '_blank')}
                className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium text-white transition"
                style={{ background: 'var(--fluent-accent, #0078d4)' }}
              >
                Open in browser
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default FilePreviewModal;
