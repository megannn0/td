/**
 * Represents a folder record returned by the backend. Folder records
 * contain basic metadata and icon information. Nested folder
 * relationships are represented via the `parent_id` field; to build
 * a hierarchy the frontend must query folders by parent.
 */
export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  icon_pack: string | null;
  icon_name: string | null;
  icon_color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
