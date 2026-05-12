/**
 * Represents a tag returned by the backend API. Tags are shared across
 * files and uniquely identified by their numeric ID. The UI may
 * display only the name for clarity.
 */
export interface Tag {
  id: number;
  name: string;
}