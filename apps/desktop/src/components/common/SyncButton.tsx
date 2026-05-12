import React, { useRef, useState } from "react";
import { useSelection } from "../../hooks/useSelection";
import { useFiles } from "../../hooks/useFiles";
import { useFolders } from "../../hooks/useFolders";
import { useTags } from "../../hooks/useTags";
import { useTransfers } from "../../hooks/useTransfers";
import * as syncApi from "../../api/sync";

const SyncButton: React.FC = () => {
  const { currentFolderId, search } = useSelection();
  const { refresh: refreshFiles } = useFiles(currentFolderId, search ?? "");
  const { refresh: refreshFolders } = useFolders(currentFolderId);
  const { refresh: refreshTags } = useTags();
  const { refresh: refreshTransfers } = useTransfers();
  const [syncing, setSyncing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncApi.syncExisting();
      await Promise.all([refreshFiles(), refreshFolders(), refreshTags(), refreshTransfers()]);
      // Poll for 10 s in case backend is still processing (202 Accepted)
      let elapsed = 0;
      pollRef.current = setInterval(async () => {
        elapsed += 2000;
        await Promise.all([refreshFiles(), refreshTransfers()]);
        if (elapsed >= 10000) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setSyncing(false);
        }
      }, 2000);
    } catch (err) {
      console.error(err);
      setSyncing(false);
    }
  };

  return (
    <button onClick={handleSync} disabled={syncing} title="Sync existing Telegram files"
      className={["flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium",
        syncing ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"].join(" ")}>
      <span className={syncing ? "animate-spin inline-block" : ""}>🔄</span>
      {syncing ? "Syncing…" : "Sync"}
    </button>
  );
};

export default SyncButton;
