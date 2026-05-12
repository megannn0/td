import { useCallback, useEffect, useState } from 'react';
import * as transfersApi from '../api/transfers';
import type { Transfer } from '../types/transfer';

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

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await transfersApi.listTransfers();
      // Sort by queue_position when available then by created_at
      list.sort((a, b) => {
        if (a.queue_position != null && b.queue_position != null) {
          return a.queue_position - b.queue_position;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setTransfers(list);
    } catch (err: any) {
      setError(err);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
    // Setup polling to keep progress updated
    const timer = setInterval(() => {
      fetchTransfers();
    }, pollInterval);
    return () => clearInterval(timer);
  }, [fetchTransfers, pollInterval]);

  return { transfers, loading, error, refresh: fetchTransfers };
}
