/** Custom event names dispatched after data mutations so that all
 * hook instances across the component tree can refresh in response.
 */
export const REFRESH_FILES = 'td:refresh-files';
export const REFRESH_FOLDERS = 'td:refresh-folders';
export const REFRESH_TAGS = 'td:refresh-tags';
export const REFRESH_TRANSFERS = 'td:refresh-transfers';
export const REFRESH_ALL = 'td:refresh-all';

export function dispatchRefresh(...events: string[]) {
  for (const name of events) {
    window.dispatchEvent(new Event(name));
  }
}
