import React from 'react';
import FileRow, { ExplorerItem } from './FileRow';

interface FileTableProps {
  items: ExplorerItem[];
  selectedItem: ExplorerItem | null;
  onSelect: (item: ExplorerItem) => void;
  onOpen: (item: ExplorerItem) => void;
  onContextMenu?: (item: ExplorerItem, event: React.MouseEvent) => void;
}

/**
 * Table view for explorer items. Displays a header row followed by
 * individual file/folder rows. Selection and double‑click events
 * propagate to parent.
 */
const FileTable: React.FC<FileTableProps> = ({
  items,
  selectedItem,
  onSelect,
  onOpen,
  onContextMenu,
}) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-2 px-2 py-1 text-xs font-semibold text-gray-600 border-b">
        <div className="col-span-2">Name</div>
        <div className="text-right">Size</div>
        <div className="text-right">Uploaded</div>
      </div>
      {items.map((item) => (
        <FileRow
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

export default FileTable;
