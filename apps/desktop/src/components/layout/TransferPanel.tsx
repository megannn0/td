import React, { useEffect, useState } from 'react';
import { useTransfers } from '../../hooks/useTransfers';
import { formatBytes, formatSpeed } from '../../utils/format';
import * as filesApi from '../../api/files';
import type { File } from '../../types/file';
import type { Transfer } from '../../types/transfer';

const TransferPanel: React.FC = () => {
  const { transfers } = useTransfers();
  const [fileMap, setFileMap] = useState<Record<number, File>>({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const list = await filesApi.listFiles(undefined, true);
        const map: Record<number, File> = {};
        list.forEach((f) => { map[f.id] = f; });
        setFileMap(map);
      } catch (err) { console.error(err); }
    })();
  }, [transfers]);

  const completedStatuses = new Set(['completed', 'failed', 'cancelled']);

  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000;
  const isStale = (t: Transfer): boolean => {
    if (completedStatuses.has(t.status)) return false;
    const lastUpdate = t.last_progress_at || t.updated_at || t.created_at;
    if (!lastUpdate) return false;
    const elapsed = now - new Date(lastUpdate).getTime();
    return elapsed > staleThreshold && (t.progress === null || t.progress === 0);
  };

  const visibleTransfers = transfers.filter((t) => !hiddenIds.has(t.id) && !isStale(t));
  const activeTransfers = visibleTransfers.filter((t) => !completedStatuses.has(t.status));
  const completedTransfers = visibleTransfers.filter((t) => completedStatuses.has(t.status));

  const handleClearAll = () => {
    const ids = new Set(hiddenIds);
    visibleTransfers.forEach((t) => ids.add(t.id));
    setHiddenIds(ids);
    setShowCompleted(false);
  };

  const handleClearCompleted = () => {
    const ids = new Set(hiddenIds);
    completedTransfers.forEach((t) => ids.add(t.id));
    setHiddenIds(ids);
    setShowCompleted(false);
  };

  const statusLabel = (s: string): string => {
    const labels: Record<string, string> = {
      queued: 'Queued', processing: 'Processing', uploading: 'Uploading',
      downloading: 'Downloading', retrying: 'Retrying', paused: 'Paused',
      cancelled: 'Cancelled', failed: 'Failed', completed: 'Completed',
    };
    return labels[s] || s;
  };

  const renderRow = (t: Transfer) => {
    const file = t.file_id != null ? fileMap[t.file_id] : undefined;
    let progressPercent: number | undefined;
    if (t.progress != null && t.progress > 0 && t.progress < 1) {
      progressPercent = Math.round(t.progress * 100);
    }
    return (
      <div key={t.id} style={{ borderBottom: '1px solid var(--db-border-light)' }}>
        <div className="flex items-center justify-between px-3 py-1.5 text-xs" style={{ color: 'var(--db-text-primary)' }}>
          <span className="truncate flex-1 min-w-0 mr-2" title={file?.name || `Transfer ${t.id}`}>
            {file ? file.name : `Transfer ${t.id}`}
          </span>
          <span style={{
            color: t.status === 'failed' ? '#D93025' : t.status === 'completed' ? '#1E8E3E' : 'var(--db-text-tertiary)',
            fontWeight: 500,
          }}>
            {statusLabel(t.status)}
          </span>
        </div>
        {!completedStatuses.has(t.status) && (
          <div className="px-3 pb-1.5">
            {progressPercent != null && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--db-text-tertiary)' }}>
                <span>{progressPercent}%</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--db-bg-tertiary)' }}>
                  <div className="h-full rounded-full" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--db-blue), #4A90D9)' }} />
                </div>
              </div>
            )}
            {t.bytes_transferred != null && t.total_bytes != null && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--db-text-tertiary)' }}>
                {formatBytes(t.bytes_transferred)} / {formatBytes(t.total_bytes)}
                {t.current_speed_bps != null && ` · ${formatSpeed(t.current_speed_bps)}`}
                {t.eta_seconds != null && t.eta_seconds > 0 && ` · ${Math.max(0, Math.round(t.eta_seconds))}s`}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (activeTransfers.length === 0 && completedTransfers.length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid var(--db-border)', background: 'var(--db-bg)' }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid var(--db-border)', background: 'var(--db-bg-secondary)' }}>
        <button onClick={() => setCollapsed(!collapsed)} className="text-xs font-medium transition flex items-center gap-1" style={{ color: 'var(--db-text-primary)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 150ms' }}>
            <polygon points="6 9 12 15 18 9" />
          </svg>
          Transfers
          {activeTransfers.length > 0 && (
            <span style={{ color: 'var(--db-blue)' }}>({activeTransfers.length} active)</span>
          )}
        </button>
        <div className="flex gap-2">
          {completedTransfers.length > 0 && (
            <button onClick={handleClearCompleted} className="text-xs transition" style={{ color: 'var(--db-text-tertiary)' }}>Clear completed</button>
          )}
          <button onClick={handleClearAll} className="text-xs transition" style={{ color: 'var(--db-text-tertiary)' }}>Clear all</button>
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-y-auto max-h-48">
          {activeTransfers.map((t) => renderRow(t))}
          {completedTransfers.length > 0 && (
            <>
              <button onClick={() => setShowCompleted(!showCompleted)}
                className="w-full text-left px-3 py-1 text-xs font-medium transition"
                style={{ color: 'var(--db-blue)', background: 'transparent' }}>
                {showCompleted ? 'Hide completed' : `Show completed (${completedTransfers.length})`}
              </button>
              {showCompleted && completedTransfers.map((t) => renderRow(t))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TransferPanel;