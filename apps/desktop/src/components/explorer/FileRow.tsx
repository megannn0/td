import React from 'react';
import type { File } from '../../types/file';
import type { Folder } from '../../types/folder';

export type ExplorerItem = (File & { type?: 'file' }) | (Folder & { type?: 'folder' });

interface FileRowProps {
  item: ExplorerItem;
  isSelected: boolean;
  onSelect: (item: ExplorerItem, event?: React.MouseEvent) => void;
  onOpen: (item: ExplorerItem) => void;
  onContextMenu: (item: ExplorerItem, event: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

function isFile(item: ExplorerItem): item is File & { type?: 'file' } {
  return (item as File).mime_type !== undefined;
}

const formatSize = (bytes: number) => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const FileRow: React.FC<FileRowProps> = ({ item, isSelected, onSelect, onOpen, onContextMenu }) => {
  const isFileItem = isFile(item);
  const mime = isFileItem ? (item as File).mime_type : null;
  const size = isFileItem ? (item as File).size : null;
  const isVideo = mime?.startsWith('video/');

  return (
    <div
      data-item-key={isFile(item) ? `file-${item.id}` : `folder-${(item as Folder).id}`}
      onClick={(e) => { onSelect(item, e); if (e.detail === 2) onOpen(item); }}
      onContextMenu={(e) => onContextMenu(item, e)}
      className="flex items-center px-3 py-2.5 cursor-pointer transition select-none"
      style={{
        background: isSelected ? 'var(--fluent-selection)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--fluent-accent)' : '3px solid transparent',
        borderBottom: '1px solid var(--fluent-border)',
        color: 'var(--fluent-text)',
      }}
    >
      {/* Icon */}
      <div className="mr-3 flex-shrink-0">
        {isFileItem ? (
          isVideo ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0061FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--db-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          )
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F9AB00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0 text-sm font-medium truncate" title={item.name}>
        {item.name}
      </div>

      {/* Size */}
      {size !== null && (
        <div className="ml-4 text-xs flex-shrink-0" style={{ color: 'var(--db-text-tertiary)', width: 80, textAlign: 'right' }}>
          {formatSize(size)}
        </div>
      )}
    </div>
  );
};

export default FileRow;