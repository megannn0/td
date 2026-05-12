import { request } from './client';
import type { VirtualFolder } from '../types/virtualFolder';
import type { File } from '../types/file';

/**
 * Fetch all virtual folders.
 */
export async function listVirtualFolders(): Promise<VirtualFolder[]> {
  return request<VirtualFolder[]>(`/virtual-folders/`);
}

/**
 * Create a new virtual folder.
 */
export async function createVirtualFolder(name: string, query: string): Promise<VirtualFolder> {
  return request<VirtualFolder>(`/virtual-folders/`, {
    method: 'POST',
    body: JSON.stringify({ name, query }),
  });
}

/**
 * Get a single virtual folder.
 */
export async function getVirtualFolder(id: number): Promise<VirtualFolder> {
  return request<VirtualFolder>(`/virtual-folders/${id}`);
}

/**
 * Update a virtual folder. Both name and query are optional.
 */
export async function updateVirtualFolder(id: number, name?: string, query?: string): Promise<VirtualFolder> {
  return request<VirtualFolder>(`/virtual-folders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, query }),
  });
}

/**
 * Delete a virtual folder.
 */
export async function deleteVirtualFolder(id: number): Promise<void> {
  await request(`/virtual-folders/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch the list of files contained in a virtual folder by evaluating
 * its query on the backend.
 */
export async function listFilesInVirtualFolder(id: number): Promise<File[]> {
  return request<File[]>(`/virtual-folders/${id}/files`);
}