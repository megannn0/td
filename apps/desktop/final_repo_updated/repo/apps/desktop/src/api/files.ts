import { request, uploadFormData } from './client';
import type { File as FileType } from '../types/file';
import type { Transfer } from '../types/transfer';

/**
 * Fetch a list of files. When `folderId` is provided only files in that
 * folder are returned. Without a folder ID all files are listed. The
 * backend does not currently support recursion; nested folders must be
 * queried separately.
 */
export async function listFiles(folderId?: number | null): Promise<FileType[]> {
  const query = folderId != null ? `?folder_id=${folderId}` : '';

  return await request<FileType[]>(`/files/${query}`, {
    method: 'GET',
  });
}

/**
 * Upload a single file. Optionally specify a folder ID to upload into a
 * particular folder. Returns both the file metadata and an initial
 * transfer record. Use the transfers API to monitor progress.
 */
export async function uploadFile(
  file: File,
  folderId?: number | null,
): Promise<{ file: FileType; transfer: Transfer }> {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId != null) {
    formData.append('folder_id', String(folderId));
  }
  return await uploadFormData<{ file: FileType; transfer: Transfer }>(
    `/files/upload`,
    formData,
  );
}

/**
 * Initiate a download of the specified file. This creates a transfer
 * record and begins reconstructing the file from Telegram. The file will
 * be saved in the configured download directory on the local machine.
 */
export async function downloadFile(fileId: number): Promise<Transfer> {
  return await request<Transfer>(`/files/${fileId}/download`, {
    method: 'POST',
  });
}

/**
 * Get a streaming URL for a file. Use this for previews such as audio
 * and video playback. The URL is relative so it can be used in the
 * browser directly. Note: the `/stream/` endpoint does not require
 * authentication and will return the raw file contents.
 */
export function getStreamUrl(fileId: number): string {
  return `/api/stream/${fileId}`;
}
