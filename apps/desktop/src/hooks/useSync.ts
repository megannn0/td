import { useState, useCallback } from "react";
import { syncExisting } from "../api/sync";

interface SyncResult {
  files_imported: number;
  parts_imported: number;
  skipped_existing: number;
}

interface UseSyncReturn {
  syncing: boolean;
  syncResult: SyncResult | null;
  syncError: Error | null;
  triggerSync: () => Promise<void>;
}

/**
 * Fix #2 – Sync refresh.
 *
 * Usage in the component that owns the Sync button:
 *
 *   const { syncing, triggerSync } = useSync({
 *     onComplete: async () => {
 *       await Promise.all([refreshFiles(), refreshFolders(),
 *                          refreshTags(), refreshTransfers()]);
 *     },
 *   });
 *
 *   <button onClick={triggerSync} disabled={syncing}>
 *     {syncing ? "Syncing…" : "Sync Existing"}
 *   </button>
 */
export function useSync(options?: {
  onComplete?: (result: SyncResult) => Promise<void> | void;
}): UseSyncReturn {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await syncExisting();
      setSyncResult(result);
      await options?.onComplete?.(result);
    } catch (err: any) {
      setSyncError(err);
    } finally {
      setSyncing(false);
    }
  }, [options]);

  return { syncing, syncResult, syncError, triggerSync };
}