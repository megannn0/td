import { useCallback, useEffect, useState } from 'react';
import * as playlistApi from '../api/playlists';
import type { Playlist } from '../types/playlist';

export interface UsePlaylistsReturn {
  playlists: Playlist[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  create: (name: string) => Promise<Playlist | null>;
  rename: (id: number, name: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  addItems: (playlistId: number, fileIds: number[]) => Promise<void>;
  removeItem: (playlistId: number, itemId: number) => Promise<void>;
  reorder: (playlistId: number, itemIds: number[]) => Promise<void>;
  get: (id: number) => Promise<Playlist>;
}

/**
 * Hook for managing playlists. Exposes CRUD operations and keeps
 * the playlist list up to date after modifications.
 */
export function usePlaylists(): UsePlaylistsReturn {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const all = await playlistApi.listPlaylists();
      // Sort by name
      all.sort((a, b) => a.name.localeCompare(b.name));
      setPlaylists(all);
    } catch (err: any) {
      setError(err);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const create = useCallback(async (name: string) => {
    try {
      const playlist = await playlistApi.createPlaylist(name);
      await fetchPlaylists();
      return playlist;
    } catch {
      return null;
    }
  }, [fetchPlaylists]);

  const rename = useCallback(async (id: number, name: string) => {
    await playlistApi.renamePlaylist(id, name);
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const remove = useCallback(async (id: number) => {
    await playlistApi.deletePlaylist(id);
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const addItems = useCallback(async (playlistId: number, fileIds: number[]) => {
    await playlistApi.addItemsToPlaylist(playlistId, fileIds);
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const removeItem = useCallback(async (playlistId: number, itemId: number) => {
    await playlistApi.removePlaylistItem(playlistId, itemId);
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const reorder = useCallback(async (playlistId: number, itemIds: number[]) => {
    await playlistApi.reorderPlaylistItems(playlistId, itemIds);
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const get = useCallback(async (id: number) => {
    return await playlistApi.getPlaylist(id);
  }, []);

  return {
    playlists,
    loading,
    error,
    refresh: fetchPlaylists,
    create,
    rename,
    remove,
    addItems,
    removeItem,
    reorder,
    get,
  };
}