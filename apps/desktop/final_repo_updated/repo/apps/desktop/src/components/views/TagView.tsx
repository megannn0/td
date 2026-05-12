import React, { useEffect, useState } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useTags } from '../../hooks/useTags';
import { searchFiles } from '../../api/search';
import Button from '../common/Button';
import EmptyState from '../explorer/EmptyState';
import FileGrid from '../explorer/FileGrid';
import FileTable from '../explorer/FileTable';
import type { File } from '../../types/file';

/**
 * View component for displaying files associated with a specific tag.
 * Allows renaming or deleting the tag. Files are fetched via the
 * backend search endpoint which supports filtering by tag names. When
 * the selected tag or search string changes the list of files is
 * refreshed. Renaming or deleting a tag will also refresh the tag
 * list via the tags hook.
 */
const TagView: React.FC = () => {
  const {
    selectedTag,
    setSelectedTag,
    setCurrentSection,
    setSelectedFile,
    viewMode,
    search,
  } = useSelection();
  const { tags, rename, remove, refresh: refreshTags } = useTags();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Find the tag object by name
  const current = tags.find((t) => t.name === selectedTag);

  // Fetch files when selected tag or search changes or when the tag list
  // updates. Without including `tags` here, the file list would remain
  // stale after renaming or deleting a tag until the user manually
  // re‑selects it. Including `tags` ensures the effect runs again
  // whenever the tags array changes.
  useEffect(() => {
    const fetch = async () => {
      if (!selectedTag) {
        setFiles([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let list = await searchFiles({ tags: [selectedTag] });
        // Filter by search term
        if (search.trim().length > 0) {
          const q = search.toLowerCase();
          list = list.filter((f) => f.name.toLowerCase().includes(q));
        }
        list.sort((a, b) => a.name.localeCompare(b.name));
        setFiles(list);
      } catch (err: any) {
        setError(err);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [selectedTag, search, tags]);

  useEffect(() => {
    if (editing && current) {
      setNameInput(current.name);
    }
  }, [editing, current]);

  const handleSave = async () => {
    if (current) {
      await rename(current.id, nameInput.trim());
      setEditing(false);
      await refreshTags();
      setSelectedTag(nameInput.trim());
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    if (!confirm(`Delete tag "${current.name}" and remove it from all files?`)) return;
    await remove(current.id);
    await refreshTags();
    setSelectedTag(null);
    setCurrentSection('tags');
    setSelectedFile(null);
  };

  const handleSelectFile = (item: any) => {
    setSelectedFile(item as any);
  };

  if (!selectedTag || !current) {
    return (
      <div className="p-4 text-gray-500">Select a tag from the sidebar.</div>
    );
  }

  if (editing) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Edit Tag</h2>
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
        <h2 className="text-lg font-semibold flex-1 truncate"># {current.name}</h2>
        <Button variant="secondary" onClick={() => setEditing(true)}>Rename</Button>
        <Button variant="danger" onClick={handleDelete}>Delete</Button>
      </div>
      {/* File list */}
      {loading ? (
        <div className="p-4 text-center text-gray-500">Loading…</div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">Failed to load files</div>
      ) : files.length === 0 ? (
        <EmptyState message="No files have this tag" />
      ) : viewMode === 'grid' ? (
        <FileGrid
          items={files as any}
          selectedItem={null as any}
          onSelect={handleSelectFile as any}
          onOpen={handleSelectFile as any}
        />
      ) : (
        <FileTable
          items={files as any}
          selectedItem={null as any}
          onSelect={handleSelectFile as any}
          onOpen={handleSelectFile as any}
        />
      )}
    </div>
  );
};

export default TagView;