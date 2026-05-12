import { request } from './client';
import type { Folder } from '../types/folder';

/**
 * List folders filtered by parent ID. If no parent ID is supplied the
 * backend returns only top‑level folders. Nested folders must be
 * requested separately.
 */
export async function listFolders(parentId?: number | null): Promise<Folder[]> {
  const query = parentId != null ? `?parent_id=${parentId}` : '';
  return await request<Folder[]>(`/folders/${query}`, {
    method: 'GET',
  });
}

/** Retrieve a single folder by ID. */
export async function getFolder(folderId: number): Promise<Folder> {
  return await request<Folder>(`/folders/${folderId}`, {
    method: 'GET',
  });
}

/** Create a new folder with the specified name and optional parent. */
export async function createFolder(
  name: string,
  parentId?: number | null,
): Promise<Folder> {
  const payload: any = { name };
  if (parentId != null) payload.parent_id = parentId;
  return await request<Folder>(`/folders/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Update an existing folder. Any of the provided fields will be
 * modified; omitted fields remain unchanged. To move a folder to the
 * root supply `null` for `parentId`.
 */
export async function updateFolder(
  folderId: number,
  { name, parentId }: { name?: string; parentId?: number | null },
): Promise<Folder> {
  const payload: any = {};
  if (name !== undefined) payload.name = name;
  if (parentId !== undefined) payload.parent_id = parentId;
  return await request<Folder>(`/folders/${folderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** Recursively delete a folder and all its children. */
export async function deleteFolder(folderId: number): Promise<void> {
  await request<void>(`/folders/${folderId}`, {
    method: 'DELETE',
  });
}
