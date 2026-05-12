import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useSelection } from '../../hooks/useSelection';

type SettingsTab = 'language' | 'appearance' | 'downloading' | 'notifications' | 'logs' | 'user' | 'experimental' | 'about';

interface NotificationSettings {
  showDeletingFile: boolean;
  showNewFile: boolean;
  showDownloadError: boolean;
  showUploadError: boolean;
  showDownloadComplete: boolean;
  showUploadComplete: boolean;
  showDownloadQueueCompleted: boolean;
  showUploadQueueCompleted: boolean;
}

const defaultNotifications: NotificationSettings = {
  showDeletingFile: true,
  showNewFile: true,
  showDownloadError: true,
  showUploadError: true,
  showDownloadComplete: true,
  showUploadComplete: true,
  showDownloadQueueCompleted: true,
  showUploadQueueCompleted: true,
};

function loadNotifications(): NotificationSettings {
  try {
    const raw = localStorage.getItem('tdNotificationSettings');
    if (raw) return { ...defaultNotifications, ...JSON.parse(raw) };
  } catch {}
  return defaultNotifications;
}

const sidebarItems: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'language',
    label: 'Language',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>,
  },
  {
    key: 'appearance',
    label: 'Appearance',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 0 0 20 4 4 0 0 0 0-8 4 4 0 0 1 0-8"/></svg>,
  },
  {
    key: 'downloading',
    label: 'Downloading',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
  {
    key: 'logs',
    label: 'Logs',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    key: 'user',
    label: 'User',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    key: 'experimental',
    label: 'Experimental',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v5l4 7H5l4-7V3z"/><line x1="9" y1="3" x2="15" y2="3"/><path d="M5 15l-2 6h18l-2-6"/></svg>,
  },
  {
    key: 'about',
    label: 'About',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  },
];

const SettingsView: React.FC = () => {
  const { settings, update, loading, error, refreshStorageTarget, storageTargets } = useSettings();
  const { setViewMode } = useSelection();
  const [activeTab, setActiveTab] = useState<SettingsTab>('downloading');
  const [downloadFolder, setDownloadFolder] = useState<string>(
    () => { try { return localStorage.getItem('downloadFolder') || ''; } catch { return ''; } },
  );
  const [downloadThumbnails, setDownloadThumbnails] = useState<boolean>(
    () => { try { return localStorage.getItem('downloadThumbnails') !== 'false'; } catch { return true; } },
  );
  const [notifications, setNotifications] = useState<NotificationSettings>(loadNotifications);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    update({ theme: newTheme });
    const root = document.documentElement;
    if (newTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  };

  const handleDownloadFolderChange = (value: string) => {
    setDownloadFolder(value);
    try { localStorage.setItem('downloadFolder', value); } catch {}
  };

  const handleThumbnailsToggle = () => {
    const next = !downloadThumbnails;
    setDownloadThumbnails(next);
    try { localStorage.setItem('downloadThumbnails', String(next)); } catch {}
  };

  const updateNotification = (key: keyof NotificationSettings) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    try { localStorage.setItem('tdNotificationSettings', JSON.stringify(next)); } catch {}
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'language':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--db-text-primary)' }}>Language settings</h2>
            <p className="text-sm" style={{ color: 'var(--db-text-tertiary)' }}>Language configuration will be available in a future update.</p>
          </div>
        );

      case 'appearance':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--db-text-primary)' }}>Appearance settings</h2>
            <div className="space-y-4">
              <div className="text-sm font-medium mb-3" style={{ color: 'var(--db-text-primary)' }}>Theme</div>
              <div className="flex gap-3">
                {(['light', 'dark'] as const).map((theme) => (
                  <label key={theme}
                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition"
                    style={{
                      background: settings.theme === theme ? 'var(--db-blue-light)' : 'var(--db-bg-secondary)',
                      border: `1px solid ${settings.theme === theme ? 'var(--db-blue)' : 'var(--db-border)'}`,
                      color: settings.theme === theme ? 'var(--db-blue)' : 'var(--db-text-primary)',
                    }}>
                    <input type="radio" name="theme" value={theme} checked={settings.theme === theme}
                      onChange={() => handleThemeChange(theme)} className="sr-only" />
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
                    <span className="text-sm font-medium capitalize">{theme}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'downloading':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--db-text-primary)' }}>Download settings</h2>
            <div className="space-y-5">
              <div>
                <div className="text-sm mb-2" style={{ color: 'var(--fluent-accent)' }}>Current folder for downloads:</div>
                <div className="text-sm mb-4" style={{ color: 'var(--db-text-primary)' }}>
                  {downloadFolder || 'Default (downloads/)'}
                </div>
              </div>

              <button
                onClick={() => {
                  const folder = prompt('Enter download folder path:', downloadFolder);
                  if (folder !== null) handleDownloadFolderChange(folder);
                }}
                className="w-full py-2.5 px-4 rounded-lg text-sm transition hover:bg-black/5 dark:hover:bg-white/10"
                style={{ border: '1px solid var(--db-border)', color: 'var(--db-text-primary)' }}
              >
                Choose folder for downloads
              </button>

              <button
                onClick={() => {
                  const folder = downloadFolder || 'downloads';
                  alert(`Download folder: ${folder}`);
                }}
                className="w-full py-2.5 px-4 rounded-lg text-sm transition hover:bg-black/5 dark:hover:bg-white/10"
                style={{ border: '1px solid var(--db-border)', color: 'var(--db-text-primary)' }}
              >
                Open downloads folder
              </button>

              <label className="flex items-center gap-3 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={downloadThumbnails}
                  onChange={handleThumbnailsToggle}
                  className="w-5 h-5 rounded accent-blue-500"
                  style={{ accentColor: 'var(--fluent-accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--db-text-primary)' }}>Is download thumbnails</span>
              </label>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--db-text-primary)' }}>Notifications settings</h2>
            <div className="space-y-3">
              {([
                { key: 'showDeletingFile' as const, label: 'Show deleting file notification' },
                { key: 'showNewFile' as const, label: 'Show new file notification' },
                { key: 'showDownloadError' as const, label: 'Show download error notification' },
                { key: 'showUploadError' as const, label: 'Show upload error notification' },
                { key: 'showDownloadComplete' as const, label: 'Show download complete notification' },
                { key: 'showUploadComplete' as const, label: 'Show upload complete notification' },
                { key: 'showDownloadQueueCompleted' as const, label: 'Show download queue completed' },
                { key: 'showUploadQueueCompleted' as const, label: 'Show upload queue completed' },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={() => updateNotification(key)}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--fluent-accent)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--db-text-primary)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'logs':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--db-text-primary)' }}>Logs</h2>
            <div className="space-y-3">
              <button
                onClick={() => alert('Logs folder location: Check your application data directory')}
                className="w-full py-2.5 px-4 rounded-lg text-sm transition hover:bg-black/5 dark:hover:bg-white/10"
                style={{ border: '1px solid var(--db-border)', color: 'var(--db-text-primary)' }}
              >
                Open logs folder
              </button>
              <button
                onClick={() => { if (confirm('Clear all logs?')) alert('Logs cleared'); }}
                className="w-full py-2.5 px-4 rounded-lg text-sm transition hover:bg-black/5 dark:hover:bg-white/10"
                style={{ border: '1px solid var(--db-border)', color: 'var(--db-text-primary)' }}
              >
                Clear logs
              </button>
            </div>
          </div>
        );

      case 'user':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--db-text-primary)' }}>User settings</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--db-text-primary)' }}>Storage Target</div>
                {loading ? (
                  <div className="text-sm" style={{ color: 'var(--db-text-tertiary)' }}>Loading...</div>
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
              </div>
            </div>
          </div>
        );

      case 'experimental':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--db-text-primary)' }}>Experimental features</h2>
            <p className="text-sm" style={{ color: 'var(--db-text-tertiary)' }}>Experimental features will be available in future updates.</p>
          </div>
        );

      case 'about':
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--db-text-primary)' }}>About T-Drive</h2>
            <div className="space-y-2">
              <div className="text-sm" style={{ color: 'var(--db-text-primary)' }}>T-Drive Lite</div>
              <div className="text-sm" style={{ color: 'var(--db-text-tertiary)' }}>Version 0.1.0</div>
              <div className="text-sm mt-4" style={{ color: 'var(--db-text-tertiary)' }}>A cloud storage solution powered by Telegram.</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex" style={{ background: 'var(--db-bg)' }}>
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 py-4 px-2" style={{ borderRight: '1px solid var(--db-border)' }}>
        <div className="flex items-center gap-2 px-3 mb-4">
          <div className="w-5 h-5 rounded" style={{ background: 'var(--fluent-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--db-text-primary)' }}>T-Drive settings</span>
        </div>
        <nav className="space-y-0.5">
          {sidebarItems.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition hover:bg-black/5 dark:hover:bg-white/10"
              style={{
                color: activeTab === key ? 'var(--fluent-accent)' : 'var(--db-text-primary)',
                background: activeTab === key ? 'transparent' : 'transparent',
                borderLeft: activeTab === key ? '3px solid var(--fluent-accent)' : '3px solid transparent',
                fontWeight: activeTab === key ? 500 : 400,
              }}
            >
              <span style={{ color: activeTab === key ? 'var(--fluent-accent)' : 'var(--db-text-tertiary)' }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default SettingsView;
