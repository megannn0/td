import React, { useEffect, useState } from 'react';
import { useSelection } from '../../hooks/useSelection';
import * as foldersApi from '../../api/folders';

interface Crumb {
  id: number | null;
  name: string;
}

/**
 * Breadcrumb navigation showing the path from the root to the current
 * folder. Fetches parent folder names on demand. Clicking a crumb
 * navigates to that folder. The root crumb is labelled “All Files”.
 */
const Breadcrumbs: React.FC = () => {
  const { currentFolderId, setCurrentFolderId } = useSelection();
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);

  useEffect(() => {
    async function buildCrumbs(folderId: number | null) {
      const path: Crumb[] = [];
      let id: number | null = folderId;
      while (id != null) {
        try {
          const folder = await foldersApi.getFolder(id);
          path.unshift({ id: folder.id, name: folder.name });
          id = folder.parent_id;
        } catch (err) {
          console.error(err);
          break;
        }
      }
      setCrumbs(path);
    }
    buildCrumbs(currentFolderId);
  }, [currentFolderId]);

  return (
    <nav className="text-sm mb-2">
      <span
        className="cursor-pointer text-blue-600 hover:underline"
        onClick={() => setCurrentFolderId(null)}
      >
        All Files
      </span>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.id ?? idx}>
          <span className="mx-1">/</span>
          {idx === crumbs.length - 1 ? (
            <span className="text-gray-700 font-medium">{crumb.name}</span>
          ) : (
            <span
              className="cursor-pointer text-blue-600 hover:underline"
              onClick={() => setCurrentFolderId(crumb.id)}
            >
              {crumb.name}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
