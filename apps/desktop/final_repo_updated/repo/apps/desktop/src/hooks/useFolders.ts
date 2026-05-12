import { useCallback, useEffect, useState } from 'react';
import * as foldersApi from '../api/folders';
import type { Folder } from '../types/folder';

interface UseFoldersReturn {
  folders: Folder[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  create: (name: string, parentId: number | null) => Promise<Folder | null>;
  update: (
    id: number,
    payload: { name?: string; parentId?: number | null },
  ) => Promise<Folder | null>;
  remove: (id: number) => Promise<boolean>;
}

/**
 * Hook for fetching folders by parent. Provides helpers for creating,
 * updating and deleting folders. Consumer components should call
 * `refresh` after modifications to update the list.
 */
export function useFolders(parentId: number | null): UseFoldersReturn {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await foldersApi.listFolders(parentId ?? undefined);
      // Sort alphabetically by name
      list.sort((a, b) => a.name.localeCompare(b.name));
      setFolders(list);
    } catch (err: any) {
      setError(err);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const create = useCallback(
    async (name: string, parent: number | null) => {
      try {
        const folder = await foldersApi.createFolder(name, parent);
        // Refresh the folder list after successful creation so the new
        // folder appears immediately in the UI.  Without this call the
        // consumer would need to invoke refresh manually, which led to
        // stale folder lists persisting until a reload.
        await fetchFolders();
        return folder;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [fetchFolders],
  );

  const update = useCallback(
    async (
      id: number,
      payload: { name?: string; parentId?: number | null },
    ) => {
      try {
        const updated = await foldersApi.updateFolder(id, payload);
        // Refresh the list after updating to reflect renames or moves.
        await fetchFolders();
        return updated;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [fetchFolders],
  );

  const remove = useCallback(async (id: number) => {
    try {
      await foldersApi.deleteFolder(id);
      // Refresh the folder list after deletion to remove the deleted
      // entry from the UI immediately.
      await fetchFolders();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, [fetchFolders]);

  return {
    folders,
    loading,
    error,
    refresh: fetchFolders,
    create,
    update,
    remove,
  };
}
