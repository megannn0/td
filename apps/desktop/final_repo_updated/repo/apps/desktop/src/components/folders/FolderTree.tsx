import React, { useState } from 'react';
import { useFolders } from '../../hooks/useFolders';
import { useSelection } from '../../hooks/useSelection';
import { getFolderIcon } from '../../utils/icons';

interface FolderTreeProps {
  parentId: number | null;
  depth: number;
}

/**
 * Recursive component that renders a list of folders for the given
 * parent. Each folder can be expanded to reveal its children. The
 * current folder is highlighted. Depth determines indentation.
 */
const FolderTree: React.FC<FolderTreeProps> = ({ parentId, depth }) => {
  const { folders, loading, error } = useFolders(parentId);
  const { currentFolderId, setCurrentFolderId } = useSelection();
  // Track which folder IDs are expanded
  const [expanded, setExpanded] = useState<number[]>([]);

  const toggle = (id: number) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  if (loading) {
    return (
      <div className="pl-4 text-xs text-gray-400">Loading…</div>
    );
  }
  if (error) {
    return (
      <div className="pl-4 text-xs text-red-500">Failed to load folders</div>
    );
  }

  return (
    <div>
      {folders.map((folder) => {
        const isSelected = currentFolderId === folder.id;
        const isExpanded = expanded.includes(folder.id);
        return (
          <div key={folder.id}>
            <div
              className={`flex items-center px-2 py-1 rounded-md cursor-pointer text-sm ${isSelected ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}
              style={{ paddingLeft: depth * 12 + 8 }}
              onClick={() => setCurrentFolderId(folder.id)}
            >
              {/* Expand/collapse chevron */}
              <span
                className="mr-1 select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(folder.id);
                }}
              >
                {isExpanded ? '▼' : '▶'}
              </span>
              <span className="mr-1 select-none">{getFolderIcon()}</span>
              <span className="truncate flex-1">{folder.name}</span>
            </div>
            {/* Nested children */}
            {isExpanded && (
              <FolderTree parentId={folder.id} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FolderTree;
