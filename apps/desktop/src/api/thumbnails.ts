/**
 * Helper for constructing thumbnail URLs. Thumbnails are served
 * through the backend API at `/api/thumbnails/:fileId`. Use this
 * function to avoid hardcoding paths throughout the UI.
 */
export function getThumbnailUrl(fileId: number): string {
  return `/api/thumbnails/${fileId}`;
}