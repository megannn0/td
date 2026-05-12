import { useState, useCallback } from 'react';
import * as filesApi from '../api/files';
import type { File as FileType } from '../types/file';
import type { Transfer } from '../types/transfer';
import { dispatchRefresh, REFRESH_ALL } from '../utils/events';

interface UploadProgress {
  /** Number of files uploaded so far */
  completed: number;
  /** Total number of files in the current batch */
  total: number;
  /** Name of the file currently being uploaded */
  currentFile: string;
  /** Bytes uploaded for the current file */
  bytesLoaded: number;
  /** Total bytes of the current file */
  bytesTotal: number;
}

interface UseUploadReturn {
  uploading: boolean;
  error: Error | null;
  progress: UploadProgress | null;
  uploadFiles: (files: File[], folderId: number | null) => Promise<{ file: FileType; transfer: Transfer }[]>;
}

/**
 * Provides XHR-based file upload with real-time progress tracking.
 * The XHR progress callback fires as the browser sends the file to the
 * backend (multipart/form-data), giving genuine byte-level progress.
 * After the initial upload completes, we poll the backend transfer record
 * to reflect the backend→Telegram processing phase (50-100% range).
 */
export function useUpload(): UseUploadReturn {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadFiles = useCallback(
    async (files: File[], folderId: number | null): Promise<{
      file: FileType;
      transfer: Transfer;
    }[]> => {
      setUploading(true);
      setError(null);
      setProgress({
        completed: 0,
        total: files.length,
        currentFile: files[0]?.name || '',
        bytesLoaded: 0,
        bytesTotal: files[0]?.size || 0,
      });
      const results: { file: FileType; transfer: Transfer }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({
          completed: i,
          total: files.length,
          currentFile: file.name,
          bytesLoaded: 0,
          bytesTotal: file.size,
        });
        try {
          // The uploadFile API uses XHR with progress callback.
          // XHR progress maps to the browser→backend transfer (0-100% of that phase).
          // To give a smooth user-visible progress, scale XHR to 0-50%,
          // then poll the backend transfer for the remaining 50-100%.
          const resp = await filesApi.uploadFile(file, folderId, (loaded, total) => {
            // Scale XHR progress to 0-50%
            const pct = total > 0 ? loaded / total : 0;
            const scaledLoaded = Math.round(pct * file.size * 0.5);
            setProgress({
              completed: i,
              total: files.length,
              currentFile: file.name,
              bytesLoaded: scaledLoaded,
              bytesTotal: file.size,
            });
          });
          // After upload completes, report the backend→Telegram phase (50-100%)
          const transferId = resp.transfer?.id;
          if (transferId) {
            const maxPolls = 30;
            for (let poll = 0; poll < maxPolls; poll++) {
              await new Promise(r => setTimeout(r, 500));
              try {
                const t = await filesApi.getUploadProgress(transferId);
                if (t?.status === 'completed' || (t?.progress ?? 0) >= 1) {
                  setProgress({
                    completed: i,
                    total: files.length,
                    currentFile: file.name,
                    bytesLoaded: file.size,
                    bytesTotal: file.size,
                  });
                  break;
                }
                if (t?.progress != null && (t.progress as number) > 0) {
                  // Scale backend progress to 50-100%
                  const backendPct = (t.progress as number) * 0.5 + 0.5;
                  setProgress({
                    completed: i,
                    total: files.length,
                    currentFile: file.name,
                    bytesLoaded: Math.round(backendPct * file.size),
                    bytesTotal: file.size,
                  });
                }
              } catch {
                // Ignore poll errors
              }
            }
          }
          results.push(resp);
        } catch (err: any) {
          console.error(err);
          setError(err);
        }
      }
      setProgress({
        completed: files.length,
        total: files.length,
        currentFile: '',
        bytesLoaded: 0,
        bytesTotal: 0,
      });
      setUploading(false);
      dispatchRefresh(REFRESH_ALL);
      setTimeout(() => setProgress(null), 2000);
      return results;
    },
    [],
  );

  return { uploading, error, progress, uploadFiles };
}