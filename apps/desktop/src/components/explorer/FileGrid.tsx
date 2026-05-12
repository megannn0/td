import React from 'react';
import FileCard from './FileCard';
import type { ExplorerItem } from './FileCard';

interface FileGridProps {
  items: ExplorerItem[];
  selectedItem: ExplorerItem | null;
  selectedIds: Set<string>;
  onSelect: (item: ExplorerItem, event?: React.MouseEvent) => void;
  onOpen: (item: ExplorerItem) => void;
  onContextMenu: (item: ExplorerItem, event: React.MouseEvent) => void;
  onDropOnFolder: (folder: any, item: ExplorerItem) => void;
}

const FileGrid: React.FC<FileGridProps> = ({
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
    <div className="p-4 overflow-y-auto" style={{ background: 'var(--db-bg)' }}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item) => (
          <FileCard
            key={itemKey(item)}
            item={item}
            isSelected={selectedIds.has(itemKey(item))}
            onSelect={onSelect}
            onOpen={onOpen}
            onContextMenu={onContextMenu}
            onDropOnFolder={onDropOnFolder}
          />
        ))}
      </div>
    </div>
  );
};

export default FileGrid;