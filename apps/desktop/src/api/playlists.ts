import { request } from './client';
import type { Playlist } from '../types/playlist';

/**
 * Fetch all playlists from the backend.
 */
export async function listPlaylists(): Promise<Playlist[]> {
  return request<Playlist[]>(`/playlists/`);
}

/**
 * Create a new playlist.
 */
export async function createPlaylist(name: string): Promise<Playlist> {
  return request<Playlist>(`/playlists/`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Get a single playlist by ID.
 */
export async function getPlaylist(playlistId: number): Promise<Playlist> {
  return request<Playlist>(`/playlists/${playlistId}`);
}

/**
 * Rename a playlist.
 */
export async function renamePlaylist(playlistId: number, name: string): Promise<Playlist> {
  return request<Playlist>(`/playlists/${playlistId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

/**
 * Delete a playlist.
 */
export async function deletePlaylist(playlistId: number): Promise<void> {
  await request(`/playlists/${playlistId}`, {
    method: 'DELETE',
  });
}

/**
 * Append files to a playlist.
 */
export async function addItemsToPlaylist(playlistId: number, fileIds: number[]): Promise<Playlist> {
  return request<Playlist>(`/playlists/${playlistId}/items`, {
    method: 'POST',
    body: JSON.stringify({ file_ids: fileIds }),
  });
}

/**
 * Remove an item from a playlist by item ID.
 */
export async function removePlaylistItem(playlistId: number, itemId: number): Promise<Playlist> {
  return request<Playlist>(`/playlists/${playlistId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * Reorder playlist items according to a new list of item IDs.
 */
export async function reorderPlaylistItems(playlistId: number, itemIds: number[]): Promise<Playlist> {
  return request<Playlist>(`/playlists/${playlistId}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ item_ids: itemIds }),
  });
}