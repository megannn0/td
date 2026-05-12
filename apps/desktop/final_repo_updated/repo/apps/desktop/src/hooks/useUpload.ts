import { useState, useCallback } from 'react';
import * as filesApi from '../api/files';
import type { File as FileType } from '../types/file';
import type { Transfer } from '../types/transfer';

interface UseUploadReturn {
  uploading: boolean;
  error: Error | null;
  uploadFiles: (files: File[], folderId: number | null) => Promise<{ file: FileType; transfer: Transfer }[]>;
}

/**
 * Hook to manage uploading one or more files. Provides a convenience
 * method which accepts a list of File objects (from an input or
 * drag‑and‑drop) and uploads them sequentially. Returns an array of
 * responses when all uploads complete. During upload the `uploading`
 * flag is true. Errors are collected and returned; a single failure
 * does not prevent subsequent files from uploading.
 */
export function useUpload(): UseUploadReturn {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadFiles = useCallback(
    async (files: File[], folderId: number | null): Promise<{
      file: FileType;
      transfer: Transfer;
    }[]> => {
      setUploading(true);
      setError(null);
      const results: { file: FileType; transfer: Transfer }[] = [];
      for (const file of files) {
        try {
          const resp = await filesApi.uploadFile(file, folderId);
          results.push(resp);
        } catch (err: any) {
          console.error(err);
          setError(err);
        }
      }
      setUploading(false);
      return results;
    },
    [],
  );

  return { uploading, error, uploadFiles };
}
