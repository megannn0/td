import React from 'react';
import type { File } from '../../types/file';
import type { Folder } from '../../types/folder';
import { getFileIcon, getFolderIcon } from '../../utils/icons';
import { formatBytes, formatDate } from '../../utils/format';

export type ExplorerItem = (File & { type?: 'file' }) | (Folder & { type?: 'folder' });

interface FileRowProps {
  item: ExplorerItem;
  selected: boolean;
  onClick: (item: ExplorerItem) => void;
  onDoubleClick: (item: ExplorerItem) => void;
  onContextMenu?: (item: ExplorerItem, event: React.MouseEvent) => void;
}

/**
 * A single row in the list view. Displays either a folder or a file
 * with its icon, name and metadata. Clicking selects the item and
 * double‑clicking opens folders or files (the latter triggers
 * selection only; download is initiated from the details panel).
 */
const FileRow: React.FC<FileRowProps> = ({ item, selected, onClick, onDoubleClick, onContextMenu }) => {
  const isFile = (item as File).mime_type !== undefined;
  const handleClick = () => onClick(item);
  const handleDoubleClick = () => onDoubleClick(item);
  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(item, e);
    }
  };
  return (
    <div
      className={`grid grid-cols-4 gap-2 px-2 py-1 text-sm items-center rounded-md cursor-pointer ${selected ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-center space-x-2 col-span-2 truncate">
        <span>{isFile ? getFileIcon(item as File) : getFolderIcon()}</span>
        <span className="truncate">{item.name}</span>
      </div>
      <div className="text-right">
        {isFile ? formatBytes((item as File).size) : ''}
      </div>
      <div className="text-right">
        {isFile ? formatDate((item as File).upload_date) : ''}
      </div>
    </div>
  );
};

export default FileRow;
