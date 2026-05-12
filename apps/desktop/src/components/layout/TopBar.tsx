import React, { useEffect, useRef, useState } from 'react';
import SearchInput from '../common/SearchInput';
import { useSelection } from '../../hooks/useSelection';
import { useFiles } from '../../hooks/useFiles';
import { useFolders } from '../../hooks/useFolders';
import { useTransfers } from '../../hooks/useTransfers';
import { useUpload } from '../../hooks/useUpload';
import { useClipboard } from '../../hooks/useClipboard';
import FolderCreateDialog from '../folders/FolderCreateDialog';
import { syncExisting } from '../../api/sync';
import { useVirtualFolders } from '../../hooks/useVirtualFolders';
import { usePlaylists } from '../../hooks/usePlaylists';
import { useTags } from '../../hooks/useTags';
import { dispatchRefresh, REFRESH_ALL } from '../../utils/events';
import * as filesApi from '../../api/files';

const ToolbarBtn: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean }> = ({ onClick, title, children, disabled }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className="flex items-center justify-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-default"
    style={{ width: 34, height: 34, color: 'var(--fluent-text)', padding: 6 }}
  >
    {children}
  </button>
);

const ToolbarDivider: React.FC = () => (
  <div style={{ width: 1, height: 22, background: 'var(--fluent-border)', margin: '0 2px' }} />
);

const TopBar: React.FC = () => {
  const { viewMode, setViewMode, search, setSearch, currentFolderId, setCurrentFolderId, currentSection,
    setCurrentSection, setSelectedVirtualFolderId, setSelectedPlaylistId, setSelectedTag,
    selectedFile, setSelectedFile, sortField, setSortField, sortDirection, setSortDirection } = useSelection();
  const { uploading, uploadFiles, progress: uploadProgress } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const { refresh: refreshFiles } = useFiles(currentFolderId, search);
  const { folders, remove: removeFolder, refresh: refreshFolders } = useFolders(currentFolderId);
  const { refresh: refreshTransfers } = useTransfers();
  const { create: createVirtualFolder, refresh: refreshVirtualFolders } = useVirtualFolders();
  const { create: createPlaylist } = usePlaylists();
  const { create: createTag, refresh: refreshTags } = useTags();

  const toggleView = () => {
    const m = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(m);
    try { localStorage.setItem('viewMode', m); } catch {}
  };

  useEffect(() => {
    try { const s = localStorage.getItem('viewMode'); if (s === 'list' || s === 'grid') setViewMode(s); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = () => fileInputRef.current?.click();
  const handleSync = async () => { setSyncing(true); try { await syncExisting(); dispatchRefresh(REFRESH_ALL); setTimeout(() => dispatchRefresh(REFRESH_ALL), 3000); } catch {} setSyncing(false); };
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (files?.length) { await uploadFiles(Array.from(files), currentFolderId); dispatchRefresh(REFRESH_ALL); } if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGoUp = () => {
    if (currentFolderId != null) setCurrentFolderId(null);
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    if (!confirm(`Delete "${selectedFile.name}"?`)) return;
    try {
      await filesApi.deleteFile(selectedFile.id);
      setSelectedFile(null);
      dispatchRefresh(REFRESH_ALL);
    } catch (err) { console.error(err); }
  };

  const handleRename = () => {
    if (!selectedFile) return;
    const newName = prompt('Rename:', selectedFile.name);
    if (newName && newName.trim()) {
      filesApi.updateFile(selectedFile.id, { name: newName.trim() }).then(() => dispatchRefresh(REFRESH_ALL));
    }
  };

  const handleNewFolder = () => setShowCreateDialog(true);

  const handleCopy = async () => {
    if (!selectedFile) return;
    try {
      await filesApi.copyFile(selectedFile.id, currentFolderId);
      dispatchRefresh(REFRESH_ALL);
    } catch (err) { console.error(err); }
  };

  const handleCut = async () => {
    if (!selectedFile) return;
    // Cut = copy then delete
    try {
      await filesApi.copyFile(selectedFile.id, currentFolderId);
      await filesApi.deleteFile(selectedFile.id);
      setSelectedFile(null);
      dispatchRefresh(REFRESH_ALL);
    } catch (err) { console.error(err); }
  };

  const handlePaste = () => {
    alert('Paste: select a file to copy/cut first, then paste is automatic');
  };

  // Only show the full toolbar for the Files section
  if (currentSection !== 'files') {
    return (
      <div style={{ background: 'var(--fluent-sidebar)', backdropFilter: 'blur(40px)', borderBottom: '1px solid var(--fluent-border)' }}>
        <div className="flex items-center px-4 h-11 gap-2">
          {currentSection === 'virtualFolders' && (
            <button onClick={async () => { const n = prompt('Name:'); if (!n) return; const q = prompt('Query:'); if (!q) return; const vf = await createVirtualFolder(n.trim(), q.trim()); await refreshVirtualFolders(); if (vf) { setSelectedVirtualFolderId(vf.id); setCurrentSection('virtualFolders'); } }}
              style={{ background: 'var(--fluent-accent)', color: 'white', borderRadius: 'var(--fluent-radius-sm)', padding: '5px 12px', fontSize: 13, fontWeight: 500 }}>+ New Search</button>
          )}
          {currentSection === 'playlists' && (
            <button onClick={async () => { const n = prompt('Name:'); if (!n) return; const pl = await createPlaylist(n.trim()); if (pl) { setSelectedPlaylistId(pl.id); setCurrentSection('playlists'); } }}
              style={{ background: 'var(--fluent-accent)', color: 'white', borderRadius: 'var(--fluent-radius-sm)', padding: '5px 12px', fontSize: 13, fontWeight: 500 }}>+ New Playlist</button>
          )}
          {currentSection === 'tags' && (
            <button onClick={async () => { const n = prompt('Name:'); if (!n) return; await createTag(n.trim()); await refreshTags(); setSelectedTag(n.trim()); setCurrentSection('tags'); }}
              style={{ background: 'var(--fluent-accent)', color: 'white', borderRadius: 'var(--fluent-radius-sm)', padding: '5px 12px', fontSize: 13, fontWeight: 500 }}>+ New Tag</button>
          )}
          <div className="flex-1" />
          <SearchInput value={search} onChange={setSearch} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--fluent-sidebar)', backdropFilter: 'blur(40px)', borderBottom: '1px solid var(--fluent-border)' }}>
      <div className="flex items-center px-2 h-11 gap-0.5">
        {/* Navigation */}
        <ToolbarBtn onClick={() => {}} title="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 18 9 12 15 6"/></svg></ToolbarBtn>
        <ToolbarBtn onClick={() => {}} title="Forward"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 18 15 12 9 6"/></svg></ToolbarBtn>
        <ToolbarBtn onClick={handleGoUp} title="Up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="18 15 12 9 6 15"/></svg></ToolbarBtn>

        <ToolbarDivider />

        {/* File operations */}
        <ToolbarBtn onClick={handleUpload} title="Upload"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></ToolbarBtn>
        <ToolbarBtn onClick={handleCut} title="Cut"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg></ToolbarBtn>
        <ToolbarBtn onClick={handleCopy} title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></ToolbarBtn>
        <ToolbarBtn onClick={handlePaste} title="Paste"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></ToolbarBtn>

        <ToolbarDivider />

        {/* Delete & Rename */}
        <ToolbarBtn onClick={handleDelete} title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="#E81123" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></ToolbarBtn>
        <ToolbarBtn onClick={handleRename} title="Rename"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></ToolbarBtn>
        <ToolbarBtn onClick={handleNewFolder} title="New folder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg></ToolbarBtn>

        <ToolbarDivider />

        {/* Sync */}
        <ToolbarBtn onClick={handleSync} title="Sync"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></ToolbarBtn>

        <div className="flex-1" />

        {/* Sort */}
        <div className="relative">
          <ToolbarBtn onClick={() => setShowSortMenu(!showSortMenu)} title="Sort">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
          </ToolbarBtn>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg overflow-hidden" style={{ background: 'var(--fluent-bg-card)', backdropFilter: 'blur(30px)', border: '1px solid var(--fluent-border)', boxShadow: 'var(--fluent-shadow-hover)', minWidth: 180 }}>
                {(['Name', 'Size', 'Date', 'Type'] as const).map((s) => {
                  const field = s.toLowerCase() as 'name' | 'size' | 'date' | 'type';
                  const isActive = sortField === field;
                  return (
                    <button key={s} onClick={() => {
                      if (isActive) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(field);
                        setSortDirection('asc');
                      }
                      setShowSortMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm transition"
                    style={{ color: isActive ? 'var(--fluent-accent)' : 'var(--fluent-text)', background: isActive ? 'var(--fluent-accent-soft)' : 'transparent' }}>
                      <span>{s}</span>
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points={sortDirection === 'asc' ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* View toggle */}
        <ToolbarBtn onClick={toggleView} title={viewMode === 'grid' ? 'List view' : 'Grid view'}>
          {viewMode === 'grid' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          )}
        </ToolbarBtn>

        {/* Search */}
        <div className="ml-1">
          <SearchInput value={search} onChange={setSearch} />
        </div>

        {/* Settings */}
        <ToolbarBtn onClick={() => setCurrentSection('settings')} title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </ToolbarBtn>
      </div>

      <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileInput} />
      <FolderCreateDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />

      {uploadProgress && (
        <div className="px-4 pb-2">
          <div className="flex items-center text-xs gap-2 mb-1" style={{ color: 'var(--fluent-text-secondary)' }}>
            <span className="truncate flex-1">{uploadProgress.completed < uploadProgress.total ? `Uploading ${uploadProgress.currentFile} (${uploadProgress.completed + 1}/${uploadProgress.total})` : `Complete (${uploadProgress.total} file${uploadProgress.total > 1 ? 's' : ''})`}</span>
            {uploadProgress.completed < uploadProgress.total && uploadProgress.bytesTotal > 0 && <span style={{ color: 'var(--fluent-accent)' }}>{Math.round((uploadProgress.bytesLoaded / uploadProgress.bytesTotal) * 100)}%</span>}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(128,128,128,0.15)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: uploadProgress.completed >= uploadProgress.total ? '100%' : uploadProgress.bytesTotal > 0 ? `${Math.round((uploadProgress.bytesLoaded / uploadProgress.bytesTotal) * 100)}%` : '0%', background: 'linear-gradient(90deg, var(--fluent-accent), #7CE228)' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;