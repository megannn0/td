import { request, uploadFormData } from './client';
import type { File as FileType } from '../types/file';
import type { Transfer } from '../types/transfer';
import { dispatchRefresh, REFRESH_ALL } from '../utils/events';

/**
 * Fetch a list of files. When `folderId` is provided only files in that
 * folder are returned. Without a folder ID only root-level files (no
 * parent folder) are returned. Pass `all=true` to fetch ALL files
 * regardless of folder (for building file maps in transfer panels).
 * The backend does not currently support recursion; nested folders must
 * be queried separately.
 */
export async function listFiles(folderId?: number | null, all?: boolean): Promise<FileType[]> {
  const params = new URLSearchParams();
  if (folderId != null) {
    params.set('folder_id', String(folderId));
  }
  if (all) {
    params.set('all', 'true');
  }
  const qs = params.toString();
  const query = qs ? `?${qs}` : '';

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
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ file: FileType; transfer: Transfer }> {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId != null) {
    formData.append('folder_id', String(folderId));
  }
  return await uploadFormData<{ file: FileType; transfer: Transfer }>(
    `/files/upload`,
    formData,
    onProgress,
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
 * Move a file to a different folder. Pass `null` to move to root.
 */
export async function updateFile(
  fileId: number,
  payload: { folder_id?: number | null; name?: string },
): Promise<FileType> {
  return await request<FileType>(`/files/${fileId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Get a streaming URL for a file. Use this for previews such as audio
 * and video playback. The URL is relative so it can be used in the
 * browser directly. Note: the `/stream/` endpoint does not require
 * authentication and will return the raw file contents.
 */
export function getStreamUrl(fileId: number, download?: boolean): string {
  const base = `/api/stream/${fileId}`;
  return download ? `${base}?download=true` : base;
}

/**
 * Poll a single transfer record to monitor backend upload/download progress.
 */
export async function getUploadProgress(transferId: number): Promise<Transfer> {
  return await request<Transfer>(`/transfers/${transferId}`, {
    method: 'GET',
  });
}

/**
 * Get a direct download URL that forces the browser to download the file
 * with the correct filename and size (non-zero). This URL triggers a
 * backend download that caches the file locally first, then streams it
 * with proper Content-Disposition headers.
 */
export function getDirectDownloadUrl(fileId: number): string {
  return `/api/files/${fileId}/download-to-browser`;
}

/**
 * Delete a file by its ID.
 */
export async function deleteFile(fileId: number): Promise<void> {
  await request(`/files/${fileId}`, {
    method: 'DELETE',
  });
}

/**
 * Copy a file to a target folder (or same folder if not specified).
 */
export async function copyFile(fileId: number, targetFolderId?: number | null): Promise<FileType> {
  const params = new URLSearchParams();
  if (targetFolderId != null) {
    params.set('target_folder_id', String(targetFolderId));
  }
  const qs = params.toString();
  const query = qs ? `?${qs}` : '';
  return await request<FileType>(`/files/${fileId}/copy${query}`, {
    method: 'POST',
  });
}
