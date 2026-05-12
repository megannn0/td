import { request } from './client';
import type { File } from '../types/file';

/**
 * Search files using the backend search endpoint. Accepts an object
 * of optional parameters corresponding to the available query
 * parameters. Only provided parameters are sent. Tags can be
 * specified as an array of tag names; multiple values generate
 * repeated "tags" query parameters. See backend search docs for
 * details.
 */
export async function searchFiles(params: {
  name?: string;
  fileType?: string;
  minSize?: number;
  maxSize?: number;
  tags?: string[];
  minDate?: string;
  maxDate?: string;
}): Promise<File[]> {
  const qs = new URLSearchParams();
  if (params.name) qs.append('name', params.name);
  if (params.fileType) qs.append('file_type', params.fileType);
  if (params.minSize !== undefined) qs.append('min_size', params.minSize.toString());
  if (params.maxSize !== undefined) qs.append('max_size', params.maxSize.toString());
  if (params.minDate) qs.append('min_date', params.minDate);
  if (params.maxDate) qs.append('max_date', params.maxDate);
  if (params.tags) {
    for (const tag of params.tags) {
      qs.append('tags', tag);
    }
  }
  const query = qs.toString();
  const url = `/search/files${query ? `?${query}` : ''}`;
  return request<File[]>(url);
}