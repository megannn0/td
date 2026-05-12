import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import DetailsPanel from './DetailsPanel';
import TransferPanel from './TransferPanel';
import FileExplorer from '../explorer/FileExplorer';
import VirtualFolderView from '../views/VirtualFolderView';
import PlaylistView from '../views/PlaylistView';
import TagView from '../views/TagView';
import SettingsView from '../views/SettingsView';
import { useSelection } from '../../hooks/useSelection';

/**
 * Top‑level layout for the Telegram Drive desktop app. It assembles
 * the sidebar, top bar, main file explorer area, details panel and
 * transfer panel into a cohesive interface. Layout uses flexbox to
 * allocate space and ensure that each region scrolls independently.
 */
const AppShell: React.FC = () => {
  const { currentSection } = useSelection();
  let mainContent: React.ReactNode = null;
  // Choose main content based on the current section
  if (currentSection === 'files') {
    mainContent = <FileExplorer />;
  } else if (currentSection === 'virtualFolders') {
    mainContent = <VirtualFolderView />;
  } else if (currentSection === 'playlists') {
    mainContent = <PlaylistView />;
  } else if (currentSection === 'tags') {
    mainContent = <TagView />;
  } else if (currentSection === 'settings') {
    mainContent = <SettingsView />;
  }
  // Determine whether to show the details panel. Only show when in a file-centric view.
  const showDetails = currentSection === 'files' || currentSection === 'virtualFolders' || currentSection === 'tags' || currentSection === 'playlists';
  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 overflow-hidden">
          {/* Main area */}
          <div className="flex-1 overflow-auto">
            {mainContent}
          </div>
          {/* Details panel */}
          {showDetails && <DetailsPanel />}
        </div>
      </div>
      <TransferPanel />
    </div>
  );
};

export default AppShell;
