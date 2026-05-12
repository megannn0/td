import { useCallback, useEffect, useState } from 'react';
import * as settingsApi from '../api/settings';

export interface UserSettings {
  theme: 'light' | 'dark';
  viewMode: 'grid' | 'list';
  /** Storage target ID or null to use the default. */
  storageTargetId: number | null;
}

export interface UseSettingsReturn {
  settings: UserSettings;
  loading: boolean;
  error: Error | null;
  update: (partial: Partial<UserSettings>) => void;
  refreshStorageTarget: () => void;
  storageTargets: { id: number; name: string }[];
}

const SETTINGS_KEY = 'telegramDriveSettings';

function loadFromLocalStorage(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return { theme: 'light', viewMode: 'grid', storageTargetId: null };
}

/**
 * Hook for managing user interface settings such as theme and view mode.
 * Settings are persisted in localStorage. Storage targets are fetched
 * from the backend and can be selected via the settings UI. When
 * settings change the hook updates localStorage automatically.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings>(loadFromLocalStorage);
  const [storageTargets, setStorageTargets] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Fetch storage targets on mount
  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const target = await settingsApi.getStorageTarget();
      // Normalize to an array for consistency
      setStorageTargets(target ? [target] : []);
    } catch (err: any) {
      setError(err);
      setStorageTargets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const update = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  return {
    settings,
    loading,
    error,
    update,
    refreshStorageTarget: fetchTargets,
    storageTargets,
  };
}