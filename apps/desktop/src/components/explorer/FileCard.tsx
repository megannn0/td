import React, { useState, useCallback } from 'react';
import type { File } from '../../types/file';
import type { Folder } from '../../types/folder';

export type ExplorerItem = (File & { type?: 'file' }) | (Folder & { type?: 'folder' });

interface FileCardProps {
  item: ExplorerItem;
  isSelected: boolean;
  onSelect: (item: ExplorerItem, event?: React.MouseEvent) => void;
  onOpen: (item: ExplorerItem) => void;
  onContextMenu: (item: ExplorerItem, event: React.MouseEvent) => void;
  onDragStart?: (item: ExplorerItem) => void;
  onDropOnFolder?: (folder: Folder, draggedItem: ExplorerItem) => void;
}

function isFile(item: ExplorerItem): item is File & { type?: 'file' } {
  return (item as File).mime_type !== undefined;
}

// Module-level variable to share dragged item across components
let draggedItemRef: ExplorerItem | null = null;

export function getDraggedItem(): ExplorerItem | null {
  return draggedItemRef;
}

export function clearDraggedItem(): void {
  draggedItemRef = null;
}

const FileCard: React.FC<FileCardProps> = ({
  item,
  isSelected,
  onSelect,
  onOpen,
  onContextMenu,
  onDragStart,
  onDropOnFolder,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const name = item.name;
  const isFileItem = isFile(item);
  const size = isFileItem ? (item as File).size : null;
  const mime = isFileItem ? (item as File).mime_type : null;
  const isVideo = mime?.startsWith('video/');
  const isFolder = !isFileItem;

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    // Store the dragged item in module variable so folder drop handlers can read it
    draggedItemRef = item;
    onDragStart?.(item);
  }, [item, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  }, [isFolder]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isFolder && onDropOnFolder && draggedItemRef) {
      onDropOnFolder(item as unknown as Folder, draggedItemRef);
      draggedItemRef = null;
    }
  }, [isFolder, item, onDropOnFolder]);

  return (
    <div
      data-item-key={isFile(item) ? `file-${item.id}` : `folder-${(item as any).id}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        onSelect(item, e);
        if (e.detail === 2) onOpen(item);
      }}
      onContextMenu={(e) => onContextMenu(item, e)}
      className="file-card rounded-lg overflow-hidden cursor-pointer select-none"
      style={{
        background: isDragOver ? 'var(--fluent-accent-soft)' : isSelected ? 'var(--fluent-selection)' : 'var(--fluent-bg-card)',
        border: `2px solid ${isDragOver ? 'var(--fluent-accent)' : isSelected ? 'var(--fluent-accent)' : 'var(--fluent-border)'}`,
        boxShadow: isSelected ? '0 0 0 1px var(--fluent-accent), var(--fluent-shadow)' : isDragOver ? '0 0 0 2px var(--fluent-accent)' : 'var(--fluent-shadow)',
        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Icon/Thumbnail area */}
      <div
        className="flex items-center justify-center"
        style={{
          height: 120,
          background: isFileItem && !isVideo ? 'var(--db-bg-secondary)' : 'var(--db-bg)',
        }}
      >
        {isFileItem ? (
          isVideo ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0061FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--db-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          )
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F9AB00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </div>

      {/* Info area */}
      <div className="p-2.5">
        <div
          className="text-sm font-medium truncate"
          style={{ color: 'var(--db-text-primary)' }}
          title={name}
        >
          {name}
        </div>
        {size !== null && (
          <div className="text-xs mt-1" style={{ color: 'var(--db-text-tertiary)' }}>
            {formatSize(size)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileCard;