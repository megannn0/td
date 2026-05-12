import React, { useEffect, useState } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useTags } from '../../hooks/useTags';
import { searchFiles } from '../../api/search';
import Button from '../common/Button';
import EmptyState from '../explorer/EmptyState';
import FileGrid from '../explorer/FileGrid';
import FileTable from '../explorer/FileTable';
import type { File } from '../../types/file';
import type { ExplorerItem } from '../explorer/FileCard';

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

  const current = tags.find((t) => t.name === selectedTag);

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
    if (editing && current) setNameInput(current.name);
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
    setCurrentSection('files');
    setSelectedFile(null);
  };

  const handleSelectFile = (item: ExplorerItem) => {
    if ('mime_type' in item) setSelectedFile(item as unknown as File);
  };

  const handleOpenFile = (item: ExplorerItem) => {
    handleSelectFile(item);
  };

  const handleContextMenu = () => {}; // No-op for tag view

  const itemKey = (item: ExplorerItem) =>
    'mime_type' in item ? `file-${item.id}` : `folder-${(item as any).id}`;

  if (!selectedTag || !current) {
    return (
      <div className="flex items-center justify-center p-12" style={{ background: 'var(--db-bg)' }}>
        <div className="text-sm" style={{ color: 'var(--db-text-tertiary)' }}>Select a tag from the sidebar</div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4" style={{ background: 'var(--db-bg)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--db-text-primary)' }}>Edit Tag</h2>
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--db-text-primary)' }}>Name</label>
          <input value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--db-bg-secondary)', border: '1px solid var(--db-border)', color: 'var(--db-text-primary)' }} />
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleSave}>Save</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--db-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid var(--db-border)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--db-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/>
          <circle cx="7" cy="7" r="1"/>
        </svg>
        <h2 className="text-base font-semibold flex-1 truncate" style={{ color: 'var(--db-text-primary)' }}>
          #{current.name}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--db-bg-tertiary)', color: 'var(--db-text-tertiary)' }}>
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Rename
        </Button>
        <Button variant="danger" onClick={handleDelete}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Delete
        </Button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm" style={{ color: 'var(--db-text-tertiary)' }}>Loading…</div>
        ) : error ? (
          <div className="flex items-center justify-center p-12 text-sm" style={{ color: '#D93025' }}>Failed to load files</div>
        ) : files.length === 0 ? (
          <EmptyState message="No files have this tag" />
        ) : viewMode === 'grid' ? (
          <FileGrid
            items={files as unknown as ExplorerItem[]}
            selectedItem={null}
            selectedIds={new Set()}
            onSelect={(item) => handleSelectFile(item)}
            onOpen={(item) => handleOpenFile(item)}
            onContextMenu={() => {}}
            onDropOnFolder={() => {}}
          />
        ) : (
          <FileTable
            items={files as unknown as ExplorerItem[]}
            selectedItem={null}
            selectedIds={new Set()}
            onSelect={(item) => handleSelectFile(item)}
            onOpen={(item) => handleOpenFile(item)}
            onContextMenu={() => {}}
            onDropOnFolder={() => {}}
          />
        )}
      </div>
    </div>
  );
};

export default TagView;