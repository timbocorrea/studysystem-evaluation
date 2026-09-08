import { useState, useCallback } from 'react';
import { createSupabaseClient } from '../services/supabaseClient';

const supabase = createSupabaseClient();

export interface InfiniteScrollOptions {
  pageSize?: number;
  filter?: Record<string, any>;
  select?: string;
}

export function useInfiniteScroll<T = any>(tableName: string, options: InfiniteScrollOptions = {}) {
  const { pageSize = 50, filter, select = '*' } = options;
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async (isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;
    
    setLoading(true);
    const currentPage = isInitial ? 0 : page;
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(tableName)
      .select(select)
      .order('created_at', { ascending: false })
      .range(from, to);

    // Apply filters if provided
    if (filter) {
      Object.entries(filter).forEach(([column, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(column, value);
        }
      });
    }

    const { data: newData, error } = await query;

    if (error) {
      console.error(`Erro ao buscar dados de ${tableName}:`, error);
    } else if (newData) {
      if (newData.length < pageSize) {
        setHasMore(false);
      }
      
      setData((prevData) => {
        const baseData = isInitial ? [] : prevData;
        // Evita duplicatas
        const existingIds = new Set(baseData.map((item: any) => item.id));
        const filteredNewData = newData.filter((item: any) => !existingIds.has(item.id)) as unknown as T[];
        return [...baseData, ...filteredNewData];
      });
      
      setPage(isInitial ? 1 : (prevPage) => prevPage + 1);
    }
    setLoading(false);
  }, [page, loading, hasMore, tableName, pageSize, JSON.stringify(filter)]);

  const reset = useCallback(() => {
    setData([]);
    setPage(0);
    setHasMore(true);
  }, []);

  return { data, loadMore, loading, hasMore, reset };
}
