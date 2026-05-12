import { useCallback, useEffect, useRef, useState } from 'react';
import * as transfersApi from '../api/transfers';
import type { Transfer } from '../types/transfer';
import { REFRESH_TRANSFERS, REFRESH_ALL } from '../utils/events';

interface UseTransfersReturn {
  transfers: Transfer[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook for retrieving all transfer jobs. Periodically refreshes the
 * list every few seconds to keep progress up to date. Consumers can
 * call `refresh` manually to force an immediate update.
 */
export function useTransfers(pollInterval = 5000): UseTransfersReturn {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const consecutiveFailuresRef = useRef(0);

  const fetchTransfers = useCallback(async () => {
    try {
      setError(null);
      const list = await transfersApi.listTransfers();
      // Reset failure count on success
      consecutiveFailuresRef.current = 0;
      // Sort by queue_position when available then by created_at
      list.sort((a, b) => {
        if (a.queue_position != null && b.queue_position != null) {
          return a.queue_position - b.queue_position;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setTransfers(list);
    } catch (err: any) {
      consecutiveFailuresRef.current += 1;
      // Only set error on first few failures to avoid console spam,
      // but keep showing stale data rather than clearing it
      if (consecutiveFailuresRef.current <= 3) {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
    // Use dynamic interval that backs off when the backend is down
    // to avoid flooding the network with ECONNREFUSED requests.
    const timer = setInterval(() => {
      const failures = consecutiveFailuresRef.current;
      if (failures > 5) {
        // Backend has been down for a while - poll much less frequently
        // This check happens in the interval but we skip execution
        return;
      }
      fetchTransfers();
    }, pollInterval);
    return () => clearInterval(timer);
  }, [fetchTransfers, pollInterval]);

  useEffect(() => {
    const handler = () => { fetchTransfers(); };
    window.addEventListener(REFRESH_TRANSFERS, handler);
    window.addEventListener(REFRESH_ALL, handler);
    return () => {
      window.removeEventListener(REFRESH_TRANSFERS, handler);
      window.removeEventListener(REFRESH_ALL, handler);
    };
  }, [fetchTransfers]);

  return { transfers, loading, error, refresh: fetchTransfers };
}
