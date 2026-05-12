import type { File as FileType } from '../types/file';

/**
 * Provide a simple mapping of file types to emoji icons. This keeps
 * the dependency footprint small by avoiding large icon libraries.
 * Future iterations could integrate FontAwesome or Heroicons if
 * desired. The returned strings can be used directly in React
 * components.
 */
export function getFileIcon(file: FileType): string {
  const name = file.name.toLowerCase();
  const ext = name.includes('.') ? name.substring(name.lastIndexOf('.') + 1) : '';
  const mime = file.mime_type || '';
  // Prioritise MIME type when available
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📄';
  // Fallback based on extension
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return '🖼️';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return '🎬';
  if (['mp3', 'flac', 'wav', 'ogg'].includes(ext)) return '🎵';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) return '📄';
  return '📄';
}

/** Return the icon for folders. Using a separate function allows
 * future customisation (e.g. icon packs) without modifying all
 * components.
 */
export function getFolderIcon(): string {
  return '📁';
}
