/**
 * Represents a file returned by the Telegram Drive backend. Internal
 * Telegram metadata (chat IDs, chunk counts) has been stripped out by
 * the API layer. All timestamps are ISO strings which should be
 * converted to Date objects on the frontend where appropriate.
 */
export interface File {
  id: number;
  name: string;
  folder_id: number | null;
  size: number;
  mime_type: string | null;
  hash: string | null;
  created_at: string;
  updated_at: string;
  upload_date: string;

  /**
   * User-defined tags attached to the file. This array contains only
   * tag names, not IDs. When empty, the file has no tags. Tags are
   * managed via the tags API.
   */
  tags?: string[];
}
