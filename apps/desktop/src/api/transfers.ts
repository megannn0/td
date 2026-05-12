import { request } from './client';
import type { Transfer } from '../types/transfer';

/**
 * Fetch the list of all transfer jobs. Transfers include uploads,
 * downloads and sync jobs. The response is ordered by creation time.
 */
export async function listTransfers(): Promise<Transfer[]> {
  return await request<Transfer[]>(`/transfers/`, {
    method: 'GET',
  });
}







