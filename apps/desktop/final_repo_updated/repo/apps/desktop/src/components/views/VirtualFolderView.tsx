import React, { useEffect, useState } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useVirtualFolders } from '../../hooks/useVirtualFolders';
import FileGrid from '../explorer/FileGrid';
import FileTable from '../explorer/FileTable';
import EmptyState from '../explorer/EmptyState';
import Button from '../common/Button';
import type { File } from '../../types/file';

/**
 * View component for displaying the contents of a virtual folder (saved search).
 * A virtual folder is defined by a name and a query string. The backend
 * evaluates the query and returns a list of files. This component
 * retrieves those files and displays them using the existing grid or
 * list views. Users can rename or delete the virtual folder and
 * refresh its results.
 */
const VirtualFolderView: React.FC = () => {
  const {
    selectedVirtualFolderId,
    setSelectedVirtualFolderId,
    setCurrentSection,
    setSelectedFile,
    viewMode,
    search,
  } = useSelection();
  const { virtualFolders, update, remove, listFiles, refresh } = useVirtualFolders();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [queryInput, setQueryInput] = useState('');

  // Find the currently selected virtual folder from the list
  const current = virtualFolders.find((vf) => vf.id === selectedVirtualFolderId);

  // Load files whenever the selected virtual folder or search term changes
  useEffect(() => {
    const fetch = async () => {
      if (!selectedVirtualFolderId) return;
      setLoading(true);
      setError(null);
      try {
        let list = await listFiles(selectedVirtualFolderId);
        // Apply client-side search filter
        if (search.trim().length > 0) {
          const q = search.toLowerCase();
          list = list.filter((f) => f.name.toLowerCase().includes(q));
        }
        // Sort alphabetically
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
  }, [selectedVirtualFolderId, listFiles, search]);

  // Populate input fields when editing starts
  useEffect(() => {
    if (editing && current) {
      setNameInput(current.name);
      setQueryInput(current.query);
    }
  }, [editing, current]);

  // Handler to refresh results
  const handleRefresh = async () => {
    if (selectedVirtualFolderId) {
      setLoading(true);
      setError(null);
      try {
        let list = await listFiles(selectedVirtualFolderId);
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
    }
  };

  // Handler to save edits to name or query
  const handleSave = async () => {
    if (current) {
      await update(current.id, nameInput.trim(), queryInput.trim());
      setEditing(false);
      await refresh();
    }
  };

  // Handler to delete the current virtual folder
  const handleDelete = async () => {
    if (!current) return;
    if (!confirm(`Delete virtual folder "${current.name}"?`)) return;
    await remove(current.id);
    // Reset selection and section after deletion
    setSelectedVirtualFolderId(null);
    setCurrentSection('virtualFolders');
    setSelectedFile(null);
  };

  // Selection handlers for files
  const handleSelect = (item: any) => {
    setSelectedFile(item as any);
  };
  const handleOpen = (item: any) => {
    // no folder navigation within virtual folder view
    setSelectedFile(item as any);
  };

  if (!selectedVirtualFolderId || !current) {
    return (
      <div className="p-4 text-gray-500">Select a virtual folder or create one.</div>
    );
  }

  if (editing) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Edit Virtual Folder</h2>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Query</label>
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
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
        <h2 className="text-lg font-semibold flex-1 truncate">🔖 {current.name}</h2>
        <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
        <Button variant="secondary" onClick={handleRefresh}>Refresh</Button>
        <Button variant="danger" onClick={handleDelete}>Delete</Button>
      </div>
      {/* Content */}
      {loading ? (
        <div className="p-4 text-center text-gray-500">Loading…</div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">Failed to load files</div>
      ) : files.length === 0 ? (
        <EmptyState message="No files match this virtual folder" />
      ) : viewMode === 'grid' ? (
        <FileGrid
          items={files as any}
          selectedItem={null as any}
          onSelect={handleSelect as any}
          onOpen={handleOpen as any}
        />
      ) : (
        <FileTable
          items={files as any}
          selectedItem={null as any}
          onSelect={handleSelect as any}
          onOpen={handleOpen as any}
        />
      )}
    </div>
  );
};

export default VirtualFolderView;