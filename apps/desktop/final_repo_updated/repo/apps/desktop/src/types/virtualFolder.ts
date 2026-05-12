/**
 * Represents a virtual (smart) folder saved on the backend.
 * A virtual folder stores a name and a query string. Query
 * syntax is defined on the server; the frontend treats it as an
 * opaque string. The list of files matching the query can be
 * retrieved via a separate API call.
 */
export interface VirtualFolder {
  id: number;
  name: string;
  query: string;
}