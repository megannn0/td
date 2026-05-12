import React from 'react';
import { useSelection } from '../../hooks/useSelection';
import FolderTree from '../folders/FolderTree';
import { useVirtualFolders } from '../../hooks/useVirtualFolders';
import { usePlaylists } from '../../hooks/usePlaylists';
import { useTags } from '../../hooks/useTags';

/**
 * Left‑hand navigation panel showing the folder hierarchy. The
 * currently selected folder is highlighted. Clicking on the root
 * (All Files) resets the folder ID to null. The folder tree
 * component loads nested folders on demand.
 */
const Sidebar: React.FC = () => {
  const {
    currentSection,
    setCurrentSection,
    currentFolderId,
    setCurrentFolderId,
    setSelectedVirtualFolderId,
    setSelectedPlaylistId,
    setSelectedTag,
    selectedVirtualFolderId,
    selectedPlaylistId,
    selectedTag,
  } = useSelection();
  const { virtualFolders } = useVirtualFolders();
  const { playlists } = usePlaylists();
  const { tags } = useTags();

  const handleSelectAllFiles = () => {
    setCurrentSection('files');
    setCurrentFolderId(null);
    setSelectedVirtualFolderId(null);
    setSelectedPlaylistId(null);
    setSelectedTag(null);
  };

  const handleVirtualFolderClick = (id: number) => {
    setCurrentSection('virtualFolders');
    setSelectedVirtualFolderId(id);
    setSelectedPlaylistId(null);
    setSelectedTag(null);
  };

  const handlePlaylistClick = (id: number) => {
    setCurrentSection('playlists');
    setSelectedPlaylistId(id);
    setSelectedVirtualFolderId(null);
    setSelectedTag(null);
  };

  const handleTagClick = (name: string) => {
    setCurrentSection('tags');
    setSelectedTag(name);
    setSelectedPlaylistId(null);
    setSelectedVirtualFolderId(null);
  };

  const handleSettingsClick = () => {
    setCurrentSection('settings');
    setSelectedPlaylistId(null);
    setSelectedVirtualFolderId(null);
    setSelectedTag(null);
  };

  return (
    <div className="w-64 border-r bg-gray-50 flex-shrink-0 overflow-auto">
      <div className="p-2 space-y-4">
        {/* Files Section */}
        <div>
          <div className="mb-1 text-xs font-semibold text-gray-600 uppercase">Files</div>
          <button
            className={`block w-full text-left px-2 py-1 rounded-md text-sm hover:bg-gray-200 ${currentSection === 'files' && currentFolderId === null ? 'bg-gray-200 font-medium' : ''}`}
            onClick={handleSelectAllFiles}
          >
            📂 All Files
          </button>
          {/* Only show folder tree when browsing files */}
          {currentSection === 'files' && (
            <div className="mt-2">
              <FolderTree parentId={null} depth={0} />
            </div>
          )}
        </div>

        {/* Virtual Folders Section */}
        <div>
          <div className="mb-1 text-xs font-semibold text-gray-600 uppercase">Virtual Folders</div>
          {virtualFolders.length === 0 && (
            <div className="text-xs text-gray-500 px-2">No saved searches</div>
          )}
          {virtualFolders.map((vf) => (
            <button
              key={vf.id}
              onClick={() => handleVirtualFolderClick(vf.id)}
              className={`block w-full text-left px-2 py-1 rounded-md text-sm hover:bg-gray-200 ${currentSection === 'virtualFolders' && vf.id === selectedVirtualFolderId ? 'bg-gray-200 font-medium' : ''}`}
            >
              🔖 {vf.name}
            </button>
          ))}
        </div>

        {/* Playlists Section */}
        <div>
          <div className="mb-1 text-xs font-semibold text-gray-600 uppercase">Playlists</div>
          {playlists.length === 0 && <div className="text-xs text-gray-500 px-2">No playlists</div>}
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => handlePlaylistClick(pl.id)}
              className={`block w-full text-left px-2 py-1 rounded-md text-sm hover:bg-gray-200 ${currentSection === 'playlists' && pl.id === selectedPlaylistId ? 'bg-gray-200 font-medium' : ''}`}
            >
              🎵 {pl.name}
            </button>
          ))}
        </div>

        {/* Tags Section */}
        <div>
          <div className="mb-1 text-xs font-semibold text-gray-600 uppercase">Tags</div>
          {tags.length === 0 && <div className="text-xs text-gray-500 px-2">No tags</div>}
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.name)}
              className={`block w-full text-left px-2 py-1 rounded-md text-sm hover:bg-gray-200 ${currentSection === 'tags' && tag.name === selectedTag ? 'bg-gray-200 font-medium' : ''}`}
            >
              # {tag.name}
            </button>
          ))}
        </div>

        {/* Settings Section */}
        <div>
          <div className="mb-1 text-xs font-semibold text-gray-600 uppercase">Settings</div>
          <button
            onClick={handleSettingsClick}
            className={`block w-full text-left px-2 py-1 rounded-md text-sm hover:bg-gray-200 ${currentSection === 'settings' ? 'bg-gray-200 font-medium' : ''}`}
          >
            ⚙️ Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
