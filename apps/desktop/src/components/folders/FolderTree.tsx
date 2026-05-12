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
  const { folders, loading, error, remove: removeFolder, refresh: refreshFolders } = useFolders(parentId);
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete folder "${folder.name}" and all its contents?`)) {
                    removeFolder(folder.id).then(() => refreshFolders());
                    if (currentFolderId === folder.id) setCurrentFolderId(parentId);
                  }
                }}
                className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition flex-shrink-0 ml-1"
                style={{ color: '#E81123', opacity: 0.6 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
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
