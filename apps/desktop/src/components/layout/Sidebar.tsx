import React from 'react';
import { useSelection } from '../../hooks/useSelection';
import FolderTree from '../folders/FolderTree';
import { useVirtualFolders } from '../../hooks/useVirtualFolders';
import { usePlaylists } from '../../hooks/usePlaylists';
import { useTags } from '../../hooks/useTags';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  right?: React.ReactNode;
}> = ({ icon, label, active, onClick, right }) => (
  <div className={`nav-item flex items-center px-3 py-2 gap-3 ${active ? 'active' : ''}`} onClick={onClick}>
    <span className="flex-shrink-0" style={active ? { color: 'var(--fluent-accent)' } : {}}>{icon}</span>
    <span className="flex-1 text-sm font-medium truncate">{label}</span>
    {right && <span className="flex-shrink-0">{right}</span>}
  </div>
);

const NavSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-1">
    <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fluent-text-tertiary)', letterSpacing: '0.08em', fontSize: 11 }}>{title}</div>
    {children}
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { currentSection, setCurrentSection, currentFolderId, setCurrentFolderId,
    setSelectedVirtualFolderId, setSelectedPlaylistId, setSelectedTag,
    selectedVirtualFolderId, selectedPlaylistId, selectedTag } = useSelection();
  const { virtualFolders } = useVirtualFolders();
  const { playlists } = usePlaylists();
  const { tags, remove: removeTag, refresh: refreshTags } = useTags();

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 gap-3 flex-shrink-0"
        style={{ width: 52, background: 'var(--fluent-sidebar)', backdropFilter: 'blur(40px)', borderRight: '1px solid var(--fluent-border)' }}>
        <button onClick={() => { setCurrentSection('files'); setCurrentFolderId(null); }}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
          style={{ color: currentSection === 'files' && currentFolderId === null ? 'var(--fluent-accent)' : 'var(--fluent-text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
        <button onClick={() => setCurrentSection('settings')}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
          style={{ color: currentSection === 'settings' ? 'var(--fluent-accent)' : 'var(--fluent-text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
          style={{ color: 'var(--fluent-text-tertiary)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: 'var(--fluent-nav-width)', background: 'var(--fluent-sidebar)', backdropFilter: 'blur(40px)', borderRight: '1px solid var(--fluent-border)' }}
      className="flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--fluent-border)' }}>
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--fluent-accent)" strokeWidth="2"><rect x="2" y="2" width="8" height="8" rx="2"/><rect x="14" y="2" width="8" height="8" rx="2"/><rect x="2" y="14" width="8" height="8" rx="2"/><rect x="14" y="14" width="8" height="8" rx="2"/></svg>
          <span className="text-sm font-semibold" style={{ color: 'var(--fluent-text)' }}>T-Drive</span>
        </div>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
          style={{ color: 'var(--fluent-text-tertiary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {/* Files */}
        <NavSection title="Browse">
          <NavItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            label="All Files"
            active={currentSection === 'files' && currentFolderId === null}
            onClick={() => { setCurrentSection('files'); setCurrentFolderId(null); setSelectedVirtualFolderId(null); setSelectedPlaylistId(null); setSelectedTag(null); }}
          />
          {currentSection === 'files' && <div className="ml-4"><FolderTree parentId={null} depth={0} /></div>}
        </NavSection>

        {/* Saved Searches */}
        <NavSection title="Searches">
          {virtualFolders.length === 0 && <div className="px-3 text-xs" style={{ color: 'var(--fluent-text-tertiary)' }}>No saved searches</div>}
          {virtualFolders.map(vf => (
            <NavItem key={vf.id}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
              label={vf.name}
              active={currentSection === 'virtualFolders' && vf.id === selectedVirtualFolderId}
              onClick={() => { setCurrentSection('virtualFolders'); setSelectedVirtualFolderId(vf.id); setSelectedPlaylistId(null); setSelectedTag(null); }}
            />
          ))}
        </NavSection>

        {/* Playlists */}
        <NavSection title="Playlists">
          {playlists.length === 0 && <div className="px-3 text-xs" style={{ color: 'var(--fluent-text-tertiary)' }}>No playlists</div>}
          {playlists.map(pl => (
            <NavItem key={pl.id}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
              label={pl.name}
              active={currentSection === 'playlists' && pl.id === selectedPlaylistId}
              onClick={() => { setCurrentSection('playlists'); setSelectedPlaylistId(pl.id); setSelectedVirtualFolderId(null); setSelectedTag(null); }}
            />
          ))}
        </NavSection>

        {/* Tags */}
        <NavSection title="Tags">
          {tags.length === 0 && <div className="px-3 text-xs" style={{ color: 'var(--fluent-text-tertiary)' }}>No tags</div>}
          {tags.map(tag => (
            <NavItem key={tag.id}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
              label={tag.name}
              active={currentSection === 'tags' && tag.name === selectedTag}
              onClick={() => { setCurrentSection('tags'); setSelectedTag(tag.name); setSelectedPlaylistId(null); setSelectedVirtualFolderId(null); }}
              right={
                <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${tag.name}"?`)) { removeTag(tag.id); refreshTags(); } }}
                  className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                  style={{ color: '#E81123', opacity: 0.6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              }
            />
          ))}
        </NavSection>

        {/* Settings */}
        <NavSection title="System">
          <NavItem
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
            label="Preferences"
            active={currentSection === 'settings'}
            onClick={() => { setCurrentSection('settings'); setSelectedPlaylistId(null); setSelectedVirtualFolderId(null); setSelectedTag(null); }}
          />
        </NavSection>
      </div>
    </div>
  );
};

export default Sidebar;