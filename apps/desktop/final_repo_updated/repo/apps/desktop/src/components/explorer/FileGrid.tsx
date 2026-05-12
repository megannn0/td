import React from 'react';
import FileCard, { ExplorerItem } from './FileCard';

interface FileGridProps {
  items: ExplorerItem[];
  selectedItem: ExplorerItem | null;
  onSelect: (item: ExplorerItem) => void;
  onOpen: (item: ExplorerItem) => void;
  onContextMenu?: (item: ExplorerItem, event: React.MouseEvent) => void;
}

/**
 * Grid view for explorer items. Uses CSS grid to create a responsive
 * layout that adjusts the number of columns based on available width.
 */
const FileGrid: React.FC<FileGridProps> = ({
  items,
  selectedItem,
  onSelect,
  onOpen,
  onContextMenu,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2">
      {items.map((item) => (
        <FileCard
          key={`${(item as any).id}-${(item as any).name}`}
          item={item}
          selected={selectedItem != null && (selectedItem as any).id === (item as any).id && (selectedItem as any).name === (item as any).name}
          onClick={onSelect}
          onDoubleClick={onOpen}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
};

export default FileGrid;
