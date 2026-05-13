/**
 * Utility for downloading files from Telegram Drive.
 *
 * Uses fetch() to download the file as a blob, then triggers a browser
 * download via a blob URL. This ensures the file is fully received
 * before saving, avoiding 0 KB downloads that can occur when the
 * backend streams slowly from Telegram.
 */

import { getDirectDownloadUrl, getStreamUrl } from '../api/files';

/**
 * Download a file by fetching it as a blob and triggering a save dialog.
 * Falls back to anchor-click on the stream endpoint if fetch fails.
 */
export async function downloadFile(fileId: number, filename: string): Promise<void> {
  try {
    const url = getDirectDownloadUrl(fileId);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: direct anchor click on stream endpoint
    const url = getStreamUrl(fileId, true);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}