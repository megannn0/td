import React from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useFolders } from '../../hooks/useFolders';

const Breadcrumbs: React.FC = () => {
  const { currentFolderId, setCurrentFolderId } = useSelection();
  const { folders } = useFolders(currentFolderId);

  const currentFolder = currentFolderId != null ? folders.find(f => f.id === currentFolderId) : null;

  return (
    <div className="flex items-center text-xs gap-1 px-2 pb-2" style={{ color: 'var(--db-text-secondary)' }}>
      <button
        onClick={() => setCurrentFolderId(null)}
        className="hover:underline transition"
        style={{ color: currentFolderId === null ? 'var(--db-blue)' : 'var(--db-text-secondary)' }}
      >
        All Files
      </button>
      {currentFolder && (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--db-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span style={{ color: 'var(--db-blue)' }}>{currentFolder.name}</span>
        </>
      )}
    </div>
  );
};

export default Breadcrumbs;