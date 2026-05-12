import type { File } from './file';

/**
 * Represents a single playlist item. Each item references a file
 * and has an ordering position within its playlist. The ``id`` is
 * unique per item and may be used to remove or reorder entries.
 */
export interface PlaylistItem {
  id: number;
  file_id: number;
  position: number;
  file?: File;
}

/**
 * Represents a playlist returned by the backend. Includes the
 * playlist's name and the ordered list of items. Deleting a
 * playlist does not delete the underlying files.
 */
export interface Playlist {
  id: number;
  name: string;
  items: PlaylistItem[];
}