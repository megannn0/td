import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useSelection } from '../../hooks/useSelection';
import Button from '../common/Button';

const SettingsView: React.FC = () => {
  const { settings, update, loading, error, refreshStorageTarget, storageTargets } = useSettings();
  const { setViewMode } = useSelection();
  const [downloadFolder, setDownloadFolder] = useState<string>(
    () => { try { return localStorage.getItem('downloadFolder') || ''; } catch { return ''; } },
  );

  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = e.target.value as 'light' | 'dark';
    update({ theme: newTheme });
    const root = document.documentElement;
    if (newTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  };

  const handleViewModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mode = e.target.value as 'grid' | 'list';
    update({ viewMode: mode });
    setViewMode(mode);
    try { localStorage.setItem('viewMode', mode); } catch {}
  };

  const handleDownloadFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDownloadFolder(value);
    try { localStorage.setItem('downloadFolder', value); } catch {}
  };

  const handleReset = () => {
    update({ theme: 'light', viewMode: 'grid', storageTargetId: null });
    setViewMode('grid');
    setDownloadFolder('');
    document.documentElement.classList.remove('dark');
    try {
      localStorage.setItem('viewMode', 'grid');
      localStorage.removeItem('downloadFolder');
    } catch {}
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8" style={{ background: 'var(--db-bg)' }}>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--db-text-primary)' }}>Preferences</h2>

      {/* Theme */}
      <section>
        <div className="text-sm font-medium mb-3" style={{ color: 'var(--db-text-primary)' }}>Theme</div>
        <div className="flex gap-2">
          {['light', 'dark'].map((theme) => (
            <label key={theme}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition"
              style={{
                background: settings.theme === theme ? 'var(--db-blue-light)' : 'var(--db-bg-secondary)',
                border: `1px solid ${settings.theme === theme ? 'var(--db-blue)' : 'var(--db-border)'}`,
                color: settings.theme === theme ? 'var(--db-blue)' : 'var(--db-text-primary)',
              }}>
              <input type="radio" name="theme" value={theme} checked={settings.theme === theme}
                onChange={handleThemeChange} className="sr-only" />
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
              <span className="text-sm font-medium">{theme === 'light' ? 'Light' : 'Dark'}</span>
            </label>
          ))}
        </div>
      </section>

      {/* View Mode */}
      <section>
        <div className="text-sm font-medium mb-3" style={{ color: 'var(--db-text-primary)' }}>Default View</div>
        <div className="flex gap-2">
          {['grid', 'list'].map((mode) => (
            <label key={mode}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition"
              style={{
                background: settings.viewMode === mode ? 'var(--db-blue-light)' : 'var(--db-bg-secondary)',
                border: `1px solid ${settings.viewMode === mode ? 'var(--db-blue)' : 'var(--db-border)'}`,
                color: settings.viewMode === mode ? 'var(--db-blue)' : 'var(--db-text-primary)',
              }}>
              <input type="radio" name="viewMode" value={mode} checked={settings.viewMode === mode}
                onChange={handleViewModeChange} className="sr-only" />
              {mode === 'grid' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              )}
              <span className="text-sm font-medium capitalize">{mode}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Download Folder */}
      <section>
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--db-text-primary)' }}>Download Folder</div>
        <input type="text" value={downloadFolder} onChange={handleDownloadFolderChange}
          placeholder="Default (downloads/)"
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--db-bg-secondary)', border: '1px solid var(--db-border)', color: 'var(--db-text-primary)' }} />
        <div className="text-xs mt-1" style={{ color: 'var(--db-text-tertiary)' }}>Custom folder path for downloaded files</div>
      </section>

      {/* Storage Target */}
      <section>
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--db-text-primary)' }}>Storage Target</div>
        {loading ? (
          <div className="text-sm" style={{ color: 'var(--db-text-tertiary)' }}>Loading…</div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#D93025' }}>
            Could not load storage target
            <button onClick={refreshStorageTarget} style={{ color: 'var(--db-blue)' }} className="hover:underline">Retry</button>
          </div>
        ) : storageTargets.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--db-text-tertiary)' }}>Default (Saved Messages)</div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--db-text-primary)' }}>{storageTargets.map((t) => t.name).join(', ')}</div>
        )}
      </section>

      {/* Reset */}
      <section>
        <Button variant="secondary" onClick={handleReset}>
          <svg className="mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Reset to Defaults
        </Button>
      </section>
    </div>
  );
};

export default SettingsView;