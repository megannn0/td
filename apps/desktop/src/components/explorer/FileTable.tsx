import React from 'react';
import FileRow, { ExplorerItem } from './FileRow';
import type { Folder } from '../../types/folder';

interface FileTableProps {
  items: ExplorerItem[];
  selectedItem: ExplorerItem | null;
  selectedIds: Set<string>;
  onSelect: (item: ExplorerItem, event?: React.MouseEvent) => void;
  onOpen: (item: ExplorerItem) => void;
  onContextMenu?: (item: ExplorerItem, event: React.MouseEvent) => void;
  onDropOnFolder?: (targetFolder: Folder, draggedItem: ExplorerItem) => void;
}

const FileTable: React.FC<FileTableProps> = ({
  items,
  selectedItem,
  selectedIds,
  onSelect,
  onOpen,
  onContextMenu,
  onDropOnFolder,
}) => {
  const itemKey = (item: ExplorerItem) =>
    'mime_type' in item ? `file-${item.id}` : `folder-${(item as any).id}`;

  return (
    <div className="overflow-y-auto" style={{ background: 'var(--db-bg)' }}>
      {/* Table header */}
      <div
        className="flex items-center px-3 py-2 text-xs font-semibold sticky top-0"
        style={{ color: 'var(--db-text-tertiary)', background: 'var(--db-bg)', borderBottom: '1px solid var(--db-border)', zIndex: 10 }}
      >
        <div className="flex-1 pl-7">Name</div>
        <div style={{ width: 80, textAlign: 'right' }}>Size</div>
      </div>
      {items.map((item) => (
        <FileRow
          key={itemKey(item)}
          item={item}
          isSelected={selectedIds.has(itemKey(item))}
          onSelect={onSelect}
          onOpen={onOpen}
          onContextMenu={(item, event) => onContextMenu?.(item, event)}
        />
      ))}
    </div>
  );
};

export default FileTable;