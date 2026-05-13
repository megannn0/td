import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import FileExplorer from '../explorer/FileExplorer';
import DetailsPanel from './DetailsPanel';
import TransferPanel from './TransferPanel';
import SettingsView from '../views/SettingsView';
import PlaylistView from '../views/PlaylistView';
import TagView from '../views/TagView';
import VirtualFolderView from '../views/VirtualFolderView';
import { useSelection } from '../../hooks/useSelection';
import FilePreviewModal from '../common/FilePreviewModal';

const AppShell: React.FC = () => {
  const { selectedFile, currentSection, previewFile, setPreviewFile } = useSelection();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const showDetails = selectedFile !== null && currentSection === 'files';

  const renderMain = () => {
    switch (currentSection) {
      case 'files': return <FileExplorer />;
      case 'settings': return <SettingsView />;
      case 'playlists': return <PlaylistView />;
      case 'tags': return <TagView />;
      case 'virtualFolders': return <VirtualFolderView />;
      default: return <FileExplorer />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden mica">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {renderMain()}
          </div>
          <TransferPanel />
        </div>
        {showDetails && <DetailsPanel />}
      </div>
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
};

export default AppShell;