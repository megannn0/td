/**
 * Representation of the active storage target configuration. The
 * frontend uses this structure to display which Telegram chat is
 * currently being used for file storage. Additional fields may be
 * returned by the backend but are ignored by the UI.
 */
export interface StorageTarget {
  id: number;
  name: string | null;
  type: 'saved_messages' | 'private_channel' | 'private_group';
  chat_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
