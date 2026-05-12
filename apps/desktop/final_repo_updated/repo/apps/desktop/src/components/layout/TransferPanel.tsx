import React, { useEffect, useState } from 'react';
import { useTransfers } from '../../hooks/useTransfers';
import { formatBytes, formatSpeed } from '../../utils/format';
import * as filesApi from '../../api/files';
import type { File } from '../../types/file';
import type { Transfer } from '../../types/transfer';

/**
 * Bottom panel displaying active and completed transfers. Active jobs
 * are shown by default while completed jobs are hidden behind a
 * toggle. Each job shows its status, progress, transferred bytes,
 * speed and ETA when available. The list polls the backend
 * periodically for updates.
 */
const TransferPanel: React.FC = () => {
  // Fetch transfers with the default polling interval (5s)
  const { transfers } = useTransfers();
  // Local map from file ID to file metadata for name lookup
  const [fileMap, setFileMap] = useState<Record<number, File>>({});
  // Whether to show completed transfers
  const [showCompleted, setShowCompleted] = useState(false);

  // Build a lookup of all files once on mount.  Because transfers
  // reference files only by ID, we fetch the full list here.  If
  // additional files are created later they will not appear in this
  // map, but that does not impact display because their names are
  // unknown until the next page refresh.
  useEffect(() => {
    (async () => {
      try {
        const list = await filesApi.listFiles(undefined);
        const map: Record<number, File> = {};
        list.forEach((f) => {
          map[f.id] = f;
        });
        setFileMap(map);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Determine which statuses represent completed jobs.  Any status
  // not listed here is considered an active transfer.
  const completedStatuses = new Set(['completed', 'failed', 'cancelled']);
  const activeTransfers = transfers.filter((t) => !completedStatuses.has(t.status));
  const completedTransfers = transfers.filter((t) => completedStatuses.has(t.status));

  // Helper to convert backend status codes into user‑friendly labels.
  const statusLabel = (status: string): string => {
    switch (status) {
      case 'queued':
        return 'Queued…';
      case 'processing':
        return 'Processing…';
      case 'uploading':
        return 'Uploading…';
      case 'downloading':
        return 'Downloading…';
      case 'retrying':
        return 'Retrying…';
      case 'paused':
        return 'Paused';
      case 'cancelled':
        return 'Cancelled';
      case 'failed':
        return 'Failed';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  // Render a single row for a transfer.  Progress bars are only
  // displayed when the backend reports an intermediate value between
  // 0 and 1.  Otherwise an indeterminate label is shown via
  // statusLabel(). Bytes transferred, speed and ETA are appended
  // when available.
  const renderRow = (t: Transfer) => {
    const file = t.file_id != null ? fileMap[t.file_id] : undefined;
    let progressPercent: number | undefined;
    if (t.progress != null && t.progress > 0 && t.progress < 1) {
      progressPercent = Math.round(t.progress * 100);
    }
    return (
      <div key={t.id} className="px-3 py-2 border-b last:border-b-0">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="truncate flex-1">
            {file ? file.name : `Transfer ${t.id}`}
          </span>
          <span className="ml-2 text-gray-500">{statusLabel(t.status)}</span>
        </div>
        <div className="mt-1 flex items-center space-x-2 text-xs text-gray-600">
          {progressPercent != null && (
            <>
              <span>{progressPercent}%</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded">
                <div
                  className="h-full bg-blue-500 rounded"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          )}
          {t.bytes_transferred != null && t.total_bytes != null && (
            <span>
              {formatBytes(t.bytes_transferred)} / {formatBytes(t.total_bytes)}
            </span>
          )}
          {t.current_speed_bps != null && (
            <span>{formatSpeed(t.current_speed_bps)}</span>
          )}
          {t.eta_seconds != null && t.eta_seconds > 0 && (
            <span>{Math.max(0, Math.round(t.eta_seconds))}s</span>
          )}
        </div>
      </div>
    );
  };

  // If there are no transfers at all, show a message.  We do not
  // differentiate between active and completed transfers in this
  // message because the completed group is hidden by default.
  if (!transfers || transfers.length === 0) {
    return (
      <div className="border-t p-2 text-sm text-gray-500">No active transfers</div>
    );
  }

  return (
    <div className="border-t overflow-y-auto max-h-64 bg-gray-50 text-sm">
      {activeTransfers.map((t) => renderRow(t))}
      {completedTransfers.length > 0 && (
        <div className="border-t">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full text-left px-3 py-2 text-blue-600 hover:underline focus:outline-none"
          >
            {showCompleted
              ? 'Hide completed'
              : `Show completed (${completedTransfers.length})`}
          </button>
          {showCompleted && (
            <div>
              {completedTransfers.map((t) => renderRow(t))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransferPanel;