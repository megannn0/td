import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useSelection } from '../../hooks/useSelection';
import Button from '../common/Button';

/**
 * Settings view for managing user preferences. Users can switch
 * between light and dark themes, choose a default view mode for
 * exploring files, and see which storage target is currently
 * configured on the backend. Preferences are persisted in
 * localStorage via the useSettings hook.
 */
const SettingsView: React.FC = () => {
  const { settings, update, loading, error, storageTargets } = useSettings();
  const { setViewMode } = useSelection();

  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    update({ theme: e.target.value as 'light' | 'dark' });
  };

  const handleViewModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mode = e.target.value as 'grid' | 'list';
    update({ viewMode: mode });
    setViewMode(mode);
  };

  const handleReset = () => {
    // Reset preferences to defaults
    update({ theme: 'light', viewMode: 'grid', storageTargetId: null });
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading settings…</div>;
  }
  if (error) {
    return <div className="p-4 text-red-500">Failed to load settings</div>;
  }
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold">Preferences</h2>
      {/* Theme */}
      <div>
        <div className="text-sm font-medium mb-1">Theme</div>
        <label className="inline-flex items-center space-x-1 mr-4">
          <input
            type="radio"
            name="theme"
            value="light"
            checked={settings.theme === 'light'}
            onChange={handleThemeChange}
          />
          <span>Light</span>
        </label>
        <label className="inline-flex items-center space-x-1">
          <input
            type="radio"
            name="theme"
            value="dark"
            checked={settings.theme === 'dark'}
            onChange={handleThemeChange}
          />
          <span>Dark</span>
        </label>
      </div>
      {/* Default View Mode */}
      <div>
        <div className="text-sm font-medium mb-1">Default View Mode</div>
        <label className="inline-flex items-center space-x-1 mr-4">
          <input
            type="radio"
            name="viewMode"
            value="grid"
            checked={settings.viewMode === 'grid'}
            onChange={handleViewModeChange}
          />
          <span>Grid</span>
        </label>
        <label className="inline-flex items-center space-x-1">
          <input
            type="radio"
            name="viewMode"
            value="list"
            checked={settings.viewMode === 'list'}
            onChange={handleViewModeChange}
          />
          <span>List</span>
        </label>
      </div>
      {/* Storage Target */}
      <div>
        <div className="text-sm font-medium mb-1">Storage Target</div>
        {storageTargets.length === 0 ? (
          <div className="text-sm text-gray-600">Default (Saved Messages)</div>
        ) : (
          <div className="text-sm text-gray-700">
            {storageTargets.map((t) => t.name).join(', ')}
          </div>
        )}
      </div>
      {/* Reset */}
      <div>
        <Button variant="secondary" onClick={handleReset}>Reset to Defaults</Button>
      </div>
    </div>
  );
};

export default SettingsView;