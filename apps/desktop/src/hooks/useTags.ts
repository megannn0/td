import { useCallback, useEffect, useState } from 'react';
import * as tagApi from '../api/tags';
import type { Tag } from '../types/tag';
import { REFRESH_TAGS, REFRESH_ALL, dispatchRefresh } from '../utils/events';

export interface UseTagsReturn {
  tags: Tag[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  create: (name: string) => Promise<void>;
  rename: (id: number, name: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

/**
 * Hook for managing tags. Provides the list of tags and helper
 * functions to create, rename, delete, and refresh them. All
 * operations automatically refresh the tag list when complete.
 */
export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const all = await tagApi.listTags();
      setTags(all);
    } catch (err: any) {
      setError(err);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    const handler = () => { fetchTags(); };
    window.addEventListener(REFRESH_TAGS, handler);
    window.addEventListener(REFRESH_ALL, handler);
    return () => {
      window.removeEventListener(REFRESH_TAGS, handler);
      window.removeEventListener(REFRESH_ALL, handler);
    };
  }, [fetchTags]);

  const create = useCallback(async (name: string) => {
    await tagApi.createTag(name);
    await fetchTags();
    dispatchRefresh(REFRESH_TAGS);
  }, [fetchTags]);

  const rename = useCallback(async (id: number, name: string) => {
    await tagApi.renameTag(id, name);
    await fetchTags();
    dispatchRefresh(REFRESH_TAGS);
  }, [fetchTags]);

  const remove = useCallback(async (id: number) => {
    await tagApi.deleteTag(id);
    await fetchTags();
    dispatchRefresh(REFRESH_TAGS);
  }, [fetchTags]);

  return { tags, loading, error, refresh: fetchTags, create, rename, remove };
}