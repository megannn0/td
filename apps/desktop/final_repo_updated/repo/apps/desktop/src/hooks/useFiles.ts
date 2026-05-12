import { useCallback, useEffect, useState } from 'react';
import * as fileApi from '../api/files';
import type { File } from '../types/file';

interface UseFilesReturn {
  files: File[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook for fetching files belonging to a specific folder. When the
 * `folderId` or `search` string changes the list is automatically
 * refreshed. Call the returned `refresh` function to manually
 * re-fetch the current list (for example after uploading or deleting a
 * file).
 */
export function useFiles(
  folderId: number | null,
  search: string,
): UseFilesReturn {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let all = await fileApi.listFiles(folderId ?? undefined);
      // Filter out internal temporary/chunk files that should not be
      // displayed in the user interface.  Files whose names start
      // with 'tmp' or which contain '.chunk' or '.part' are considered
      // implementation details and are hidden from the explorer.
      all = all.filter((f) => {
        const name = f.name?.toLowerCase() || '';
        if (name.startsWith('tmp')) return false;
        if (name.includes('.chunk') || name.includes('.part')) return false;
        return true;
      });
      // Apply client‑side search if provided. Backend search could be
      // integrated here when available.
      if (search.trim().length > 0) {
        const q = search.toLowerCase();
        all = all.filter((f) => f.name.toLowerCase().includes(q));
      }
      // Sort alphabetically by name
      all.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(all);
    } catch (err: any) {
      setError(err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [folderId, search]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, loading, error, refresh: fetchFiles };
}
