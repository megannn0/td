import { request } from './client';
import type { StorageTarget } from '../types/settings';

/** Retrieve the active storage target configuration. If none exists
 * the backend will create a default Saved Messages target.
 */
export async function getStorageTarget(): Promise<StorageTarget> {
  return await request<StorageTarget>(`/settings/storage-target`, {
    method: 'GET',
  });
}
