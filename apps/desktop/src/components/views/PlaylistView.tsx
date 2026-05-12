import React, { useEffect, useState } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { usePlaylists } from '../../hooks/usePlaylists';
import Button from '../common/Button';
import EmptyState from '../explorer/EmptyState';
import AudioPlayer from '../common/AudioPlayer';
import { formatBytes } from '../../utils/format';
import type { Playlist, PlaylistItem } from '../../types/playlist';

/**
 * View component for displaying and editing a playlist. Users can
 * rename or delete the playlist, append the currently selected file
 * to it, reorder tracks, remove tracks, and play the entire list
 * using the AudioPlayer. The playlist is loaded via the
 * ``get`` function of the playlists hook whenever the selection
 * changes.
 */
const PlaylistView: React.FC = () => {
  const {
    selectedPlaylistId,
    setSelectedPlaylistId,
    setCurrentSection,
    setSelectedFile,
    selectedFile,
  } = useSelection();
  const {
    get,
    rename,
    remove,
    reorder,
    removeItem,
    addItems,
  } = usePlaylists();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Load playlist when selection changes
  useEffect(() => {
    const load = async () => {
      if (!selectedPlaylistId) {
        setPlaylist(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const pl = await get(selectedPlaylistId);
        setPlaylist(pl);
      } catch (err: any) {
        setError(err);
        setPlaylist(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedPlaylistId, get]);

  useEffect(() => {
    if (editing && playlist) {
      setNameInput(playlist.name);
    }
  }, [editing, playlist]);

  const handleSave = async () => {
    if (playlist) {
      await rename(playlist.id, nameInput.trim());
      setEditing(false);
      const pl = await get(playlist.id);
      setPlaylist(pl);
    }
  };

  const handleDelete = async () => {
    if (!playlist) return;
    if (!confirm(`Delete playlist "${playlist.name}"?`)) return;
    await remove(playlist.id);
    setSelectedPlaylistId(null);
    setCurrentSection('playlists');
  };

  const handleAddCurrent = async () => {
    if (!playlist || !selectedFile) return;
    await addItems(playlist.id, [selectedFile.id]);
    const pl = await get(playlist.id);
    setPlaylist(pl);
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!playlist) return;
    await removeItem(playlist.id, itemId);
    const pl = await get(playlist.id);
    setPlaylist(pl);
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    if (!playlist) return;
    const items = playlist.items.slice();
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    // Swap positions in the array
    const temp = items[index];
    items[index] = items[newIndex];
    items[newIndex] = temp;
    // Build list of item IDs in new order
    const ids = items.map((it) => it.id);
    await reorder(playlist.id, ids);
    const pl = await get(playlist.id);
    setPlaylist(pl);
  };

  // When clicking on a row, select the underlying file for details
  const handleRowClick = (item: PlaylistItem) => {
    if (item.file) {
      setSelectedFile(item.file);
    }
  };

  if (!selectedPlaylistId || !playlist) {
    return (
      <div className="p-4 text-gray-500">Select a playlist or create one.</div>
    );
  }

  if (editing) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Edit Playlist</h2>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div className="flex space-x-2">
            <Button variant="primary" onClick={handleSave}>Save</Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header with name and actions */}
      <div className="p-2 flex items-center space-x-2 border-b bg-white">
        <h2 className="text-lg font-semibold flex-1 truncate">🎵 {playlist.name}</h2>
        <Button variant="secondary" onClick={() => setEditing(true)}>Rename</Button>
        <Button variant="secondary" onClick={handleAddCurrent} disabled={!selectedFile}>Add Current</Button>
        <Button variant="danger" onClick={handleDelete}>Delete</Button>
      </div>
      {/* Audio player if playlist has items */}
      {playlist.items.length > 0 && (
        <AudioPlayer playlist={playlist} />
      )}
      {/* Items list */}
      {loading ? (
        <div className="p-4 text-center text-gray-500">Loading…</div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">Failed to load playlist</div>
      ) : playlist.items.length === 0 ? (
        <EmptyState message="This playlist is empty" />
      ) : (
        <div className="p-2 space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-5 gap-2 px-2 py-1 text-xs font-semibold text-gray-600 border-b">
            <div>#</div>
            <div className="col-span-2">Name</div>
            <div className="text-right">Size</div>
            <div className="text-right">Actions</div>
          </div>
          {playlist.items.map((item, idx) => (
            <div
              key={item.id}
              className="grid grid-cols-5 gap-2 px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer"
              onClick={() => handleRowClick(item)}
            >
              <div>{idx + 1}</div>
              <div className="col-span-2 truncate">{item.file?.name || ''}</div>
              <div className="text-right">{item.file ? formatBytes(item.file.size) : ''}</div>
              <div className="flex justify-end space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(idx, -1);
                  }}
                  disabled={idx === 0}
                  className="px-1 py-0.5 text-xs border rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  ▲
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(idx, 1);
                  }}
                  disabled={idx === playlist.items.length - 1}
                  className="px-1 py-0.5 text-xs border rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  ▼
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveItem(item.id);
                  }}
                  className="px-1 py-0.5 text-xs border rounded hover:bg-red-100 text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistView;