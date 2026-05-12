import { request } from './client';

/** Trigger a scan of existing Telegram files. The backend will import any
 * messages found in the configured storage target and return a
 * summary of the results. This operation may take several seconds.
 */
export async function syncExisting(): Promise<{ files_imported: number; parts_imported: number; skipped_existing: number }> {
  return await request<{ files_imported: number; parts_imported: number; skipped_existing: number }>(
    `/sync/existing`,
    {
      method: 'POST',
    },
  );
}
