import React, { useEffect, useRef, useState } from 'react';
import Button from '../common/Button';
import SearchInput from '../common/SearchInput';
import { useSelection } from '../../hooks/useSelection';
import { useFiles } from '../../hooks/useFiles';
import { useFolders } from '../../hooks/useFolders';
import { useTransfers } from '../../hooks/useTransfers';
import { useUpload } from '../../hooks/useUpload';
import FolderCreateDialog from '../folders/FolderCreateDialog';
import { syncExisting } from '../../api/sync';
import { useVirtualFolders } from '../../hooks/useVirtualFolders';
import { usePlaylists } from '../../hooks/usePlaylists';
import { useTags } from '../../hooks/useTags';

/**
 * Top bar containing global actions: upload, sync, new folder,
 * search and view toggles. State for creating folders and uploading
 * files is managed here. Search text and view mode are exposed via
 * the selection context so they can be consumed by other components.
 */
const TopBar: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    search,
    setSearch,
    currentFolderId,
    currentSection,
    setCurrentSection,
    setSelectedVirtualFolderId,
    setSelectedPlaylistId,
    setSelectedTag,
  } = useSelection();
  const { uploading, uploadFiles } = useUpload();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Obtain refresh functions from various hooks so that uploads and
  // synchronisation can trigger a reload of the current folder as well
  // as other entities.  These hooks are used here solely to obtain
  // their refresh functions; the returned data and loading state are
  // ignored.
  const { refresh: refreshFiles } = useFiles(currentFolderId, search);
  const { refresh: refreshFolders } = useFolders(currentFolderId);
  const { refresh: refreshTransfers } = useTransfers();

  // Hooks for creating new virtual folders, playlists and tags.  For tags
  // we also extract the refresh function so that tag lists can be
  // reloaded after creation via the same hook instance.
  const { create: createVirtualFolder, refresh: refreshVirtualFolders } = useVirtualFolders();
  const { create: createPlaylist } = usePlaylists();
  const { create: createTag, refresh: refreshTags } = useTags();

  const handleFileInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await uploadFiles(Array.from(files), currentFolderId);
      // Refresh the file list so newly uploaded files appear without
      // requiring a manual refresh.  Errors are handled by the hook.
      await refreshFiles();
    }
    // Reset input value so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Kick off the sync operation. The backend returns 202 to
      // indicate that the scan has started and may take several
      // seconds. We ignore the returned value because we refresh
      // explicitly below.
      await syncExisting();
      // Immediately refresh files/folders/tags/transfers so any new
      // items show up without requiring a restart.  We await each
      // refresh sequentially to avoid overloading the backend.
      await refreshFiles();
      await refreshFolders();
      await refreshTags();
      await refreshTransfers();
      // Poll again after a short delay in case the backend is still
      // processing.  This simple polling ensures that files imported
      // asynchronously are visible within a few seconds without
      // requiring the user to navigate away and back.
      setTimeout(async () => {
        await refreshFiles();
        await refreshFolders();
        await refreshTags();
        await refreshTransfers();
      }, 3000);
    } catch (err) {
      console.error(err);
    }
    setSyncing(false);
  };

  const toggleView = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    try {
      localStorage.setItem('viewMode', newMode);
    } catch {
      // ignore storage errors
    }
  };

  // On mount, load the saved view mode from localStorage.  If none
  // exists, the default 'grid' remains.  Without this effect the
  // selection context would always reset to 'grid' when the page
  // reloads.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('viewMode');
      if (saved === 'list' || saved === 'grid') {
        setViewMode(saved);
      }
    } catch {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create a new virtual folder via prompt
  const handleNewVirtualFolder = async () => {
    const name = prompt('Name for the saved search:');
    if (!name) return;
    const query = prompt('Enter search query (e.g., tag:movie, type:video, size > 2GB):');
    if (!query) return;
    const vf = await createVirtualFolder(name.trim(), query.trim());
    await refreshVirtualFolders();
    if (vf) {
      setSelectedVirtualFolderId(vf.id);
      setCurrentSection('virtualFolders');
    }
  };
  // Create a new playlist via prompt
  const handleNewPlaylist = async () => {
    const name = prompt('Name for the new playlist:');
    if (!name) return;
    const pl = await createPlaylist(name.trim());
    if (pl) {
      setSelectedPlaylistId(pl.id);
      setCurrentSection('playlists');
    }
  };
  // Create a new tag via prompt
  const handleNewTag = async () => {
    const name = prompt('Name for the new tag:');
    if (!name) return;
    await createTag(name.trim());
    // Refresh the tag list so the new tag appears immediately.  Without
    // this call the sidebar would remain stale until navigation.
    await refreshTags();
    setSelectedTag(name.trim());
    setCurrentSection('tags');
  };

  return (
    <div className="flex items-center space-x-2 border-b bg-white px-2 py-1">
      {currentSection === 'files' && (
        <>
          <Button
            onClick={handleUploadClick}
            disabled={uploading}
            variant="primary"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
          <Button onClick={handleSync} disabled={syncing} variant="secondary">
            {syncing ? 'Syncing…' : 'Sync'}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} variant="secondary">
            New Folder
          </Button>
        </>
      )}
      {currentSection === 'virtualFolders' && (
        <Button onClick={handleNewVirtualFolder} variant="primary">
          New Search
        </Button>
      )}
      {currentSection === 'playlists' && (
        <Button onClick={handleNewPlaylist} variant="primary">
          New Playlist
        </Button>
      )}
      {currentSection === 'tags' && (
        <Button onClick={handleNewTag} variant="primary">
          New Tag
        </Button>
      )}
      {/* Spacer */}
      <div className="flex-1" />
      {/* Search only available in files and tag/virtualFolder contexts */}
      {(currentSection === 'files' || currentSection === 'virtualFolders' || currentSection === 'tags') && (
        <SearchInput value={search} onChange={setSearch} />
      )}
      {/* View toggle available in all sections showing lists */}
      {(currentSection === 'files' || currentSection === 'virtualFolders' || currentSection === 'tags' || currentSection === 'playlists') && (
        <Button onClick={toggleView} variant="ghost">
          {viewMode === 'grid' ? 'List View' : 'Grid View'}
        </Button>
      )}
      {/* Create folder dialog */}
      <FolderCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
};

export default TopBar;
