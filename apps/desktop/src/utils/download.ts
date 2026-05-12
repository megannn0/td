/**
 * Utility for downloading files from Telegram Drive.
 * 
 * Uses the stream endpoint with `?download=true` which returns the file
 * with proper Content-Disposition: attachment headers. The backend handles:
 * - Serving from local cache if available
 * - Streaming from Telegram parts on-demand (no local file write needed)
 * - Proper Content-Disposition and Content-Length headers
 * 
 * We use an anchor element with the `download` attribute so the browser
 * downloads the file instead of navigating to it.
 */

import { getStreamUrl } from '../api/files';

/**
 * Download a file using the stream endpoint.
 * Opens in a new tab as fallback if anchor download fails.
 */
export async function downloadFile(fileId: number, filename: string): Promise<void> {
  const url = getStreamUrl(fileId, true);
  
  // Method 1: Use anchor element with download attribute (same-origin)
  // This triggers the browser's download dialog with the correct filename
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}