import React from 'react';
import type { File } from '../../types/file';
import type { Folder } from '../../types/folder';
import { getFileIcon, getFolderIcon } from '../../utils/icons';

export type ExplorerItem = (File & { type?: 'file' }) | (Folder & { type?: 'folder' });

interface FileCardProps {
  item: ExplorerItem;
  selected: boolean;
  onClick: (item: ExplorerItem) => void;
  onDoubleClick: (item: ExplorerItem) => void;
  onContextMenu?: (item: ExplorerItem, event: React.MouseEvent) => void;
}

/**
 * A card used in grid view to display a folder or file. Shows an
 * oversized icon above the filename. Selection highlights the card.
 */
const FileCard: React.FC<FileCardProps> = ({ item, selected, onClick, onDoubleClick, onContextMenu }) => {
  const isFile = (item as File).mime_type !== undefined;
  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(item, e);
    }
  };
  return (
    <div
      className={`flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer ${selected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-100'}`}
      onClick={() => onClick(item)}
      onDoubleClick={() => onDoubleClick(item)}
      onContextMenu={handleContextMenu}
    >
      <div className="text-4xl mb-1">
        {isFile ? getFileIcon(item as File) : getFolderIcon()}
      </div>
      <div className="text-sm text-center truncate w-full">
        {item.name}
      </div>
    </div>
  );
};

export default FileCard;
