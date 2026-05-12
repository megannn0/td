import { request } from './client';
import type { Tag } from '../types/tag';
import type { File } from '../types/file';

/**
 * Fetch all tags from the backend.
 */
export async function listTags(): Promise<Tag[]> {
  return request<Tag[]>(`/tags/`);
}

/**
 * Create a new tag. If a tag with the same name exists it is returned.
 */
export async function createTag(name: string): Promise<Tag> {
  return request<Tag>(`/tags/`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Rename an existing tag.
 */
export async function renameTag(tagId: number, name: string): Promise<Tag> {
  return request<Tag>(`/tags/${tagId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

/**
 * Delete a tag by ID. Returns nothing on success.
 */
export async function deleteTag(tagId: number): Promise<void> {
  await request(`/tags/${tagId}`, {
    method: 'DELETE',
  });
}

/**
 * Add a list of tag names to a file. Tags will be created on demand.
 * Returns the updated file with its new tag list.
 */
export async function addTagsToFile(fileId: number, tags: string[]): Promise<File> {
  return request<File>(`/tags/files/${fileId}`, {
    method: 'POST',
    body: JSON.stringify(tags),
  });
}

/**
 * Remove a single tag from a file. Returns the updated file.
 */
export async function removeTagFromFile(fileId: number, tagId: number): Promise<File> {
  return request<File>(`/tags/files/${fileId}/${tagId}`, {
    method: 'DELETE',
  });
}