import { useCallback, useEffect, useState } from 'react';
import * as vfApi from '../api/virtualFolders';
import type { VirtualFolder } from '../types/virtualFolder';
import type { File } from '../types/file';

export interface UseVirtualFoldersReturn {
  virtualFolders: VirtualFolder[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  create: (name: string, query: string) => Promise<VirtualFolder | null>;
  update: (id: number, name?: string, query?: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  listFiles: (id: number) => Promise<File[]>;
}

/**
 * Hook for managing virtual folders (saved searches). Provides
 * functions to create, update, delete, and retrieve the list of
 * folders and their file results.
 */
export function useVirtualFolders(): UseVirtualFoldersReturn {
  const [virtualFolders, setVirtualFolders] = useState<VirtualFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchVfs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const all = await vfApi.listVirtualFolders();
      // sort by name
      all.sort((a, b) => a.name.localeCompare(b.name));
      setVirtualFolders(all);
    } catch (err: any) {
      setError(err);
      setVirtualFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVfs();
  }, [fetchVfs]);

  const create = useCallback(async (name: string, query: string) => {
    try {
      const vf = await vfApi.createVirtualFolder(name, query);
      await fetchVfs();
      return vf;
    } catch {
      return null;
    }
  }, [fetchVfs]);

  const update = useCallback(async (id: number, name?: string, query?: string) => {
    await vfApi.updateVirtualFolder(id, name, query);
    await fetchVfs();
  }, [fetchVfs]);

  const remove = useCallback(async (id: number) => {
    await vfApi.deleteVirtualFolder(id);
    await fetchVfs();
  }, [fetchVfs]);

  const listFiles = useCallback(async (id: number) => {
    return await vfApi.listFilesInVirtualFolder(id);
  }, []);

  return { virtualFolders, loading, error, refresh: fetchVfs, create, update, remove, listFiles };
}