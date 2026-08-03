import { useState, useCallback } from "react";
import { getFeed, Event, FeedResponse } from "@/lib/api";

interface FeedParams {
  category?: string;
  tag_slug?: string;
  source_id?: string;
  min_score?: number;
  max_score?: number;
  search?: string;
  start_date?: Date;
  end_date?: Date;
}

interface UseFeedPaginationResult {
  events: Event[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  fetchNextPage: () => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for paginated feed fetching with lazy loading
 * Only fetches the first page initially for fast loading (within 5 seconds)
 */
export function useFeedPagination(
  initialParams?: FeedParams,
  initialPageSize: number = 25
): UseFeedPaginationResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(initialPageSize);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentParams, setCurrentParams] = useState<FeedParams>(initialParams || {});

  // Build params for API call
  const buildParams = useCallback((pageNum: number, params: FeedParams) => ({
    page: pageNum,
    page_size: pageSize,
    category: params.category,
    tag_slug: params.tag_slug,
    source_id: params.source_id,
    min_score: params.min_score,
    max_score: params.max_score,
    search: params.search,
    start_date: params.start_date,
    end_date: params.end_date,
  }), [pageSize]);

  // Fetch first page
  const fetchFirstPage = useCallback(async (params: FeedParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const feedData = await getFeed(buildParams(1, params));
      setEvents(feedData.events || []);
      setTotal(feedData.total);
      setPage(1);
      setHasMore(feedData.has_next);
      console.log(`Loaded ${feedData.events?.length || 0} events (total: ${feedData.total})`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch feed'));
      console.error('Failed to fetch feed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [buildParams]);

  // Fetch next page (lazy load)
  const fetchNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    setError(null);
    
    try {
      const nextPage = page + 1;
      const feedData = await getFeed(buildParams(nextPage, currentParams));
      
      setEvents(prev => [...prev, ...(feedData.events || [])]);
      setPage(nextPage);
      setHasMore(feedData.has_next);
      console.log(`Loaded page ${nextPage}: ${feedData.events?.length || 0} more events (total: ${feedData.total})`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch more events'));
      console.error('Failed to fetch more events:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, currentParams, buildParams]);

  // Reset and refetch with new params
  const reset = useCallback((params?: FeedParams) => {
    const newParams = params || currentParams;
    setCurrentParams(newParams);
    setEvents([]);
    setTotal(0);
    setPage(0);
    setHasMore(false);
    fetchFirstPage(newParams);
  }, [currentParams, fetchFirstPage]);

  // Initialize on mount
  useState(() => {
    fetchFirstPage(initialParams || {});
  });

  return {
    events,
    total,
    page,
    pageSize,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    fetchNextPage,
    reset,
  };
}

/**
 * Legacy function for backward compatibility
 * Only fetches first page by default for fast loading
 */
export async function fetchAllFeedPages(
  params: FeedParams,
  options?: { 
    maxPages?: number;
    maxTotal?: number;
    forceSinglePage?: boolean;
  }
): Promise<Event[]> {
  const { maxPages = 1, maxTotal = 100, forceSinglePage = true } = options || {};
  
  // If forceSinglePage is true (default), only fetch first page
  // This ensures fast initial load within 5 seconds
  const allEvents: Event[] = [];
  let currentPage = 1;
  const pageSize = 100;
  let totalCount = 0;
  let hasMore = true;

  // For fast initial load, only fetch first page
  if (forceSinglePage) {
    console.log(`Fetching page 1 (fast mode - single page)...`);
    const feedData = await getFeed({
      page: 1,
      page_size: pageSize,
      category: params.category,
      tag_slug: params.tag_slug,
      source_id: params.source_id,
      min_score: params.min_score,
      max_score: params.max_score,
      search: params.search,
      start_date: params.start_date,
      end_date: params.end_date,
    });

    console.log(`Page 1: ${feedData.events?.length || 0} events, total: ${feedData.total}`);
    return feedData.events || [];
  }

  // Legacy mode: fetch all pages (only used if forceSinglePage is false)
  while (hasMore && currentPage <= maxPages && allEvents.length < maxTotal) {
    console.log(`Fetching page ${currentPage}...`);
    const feedData = await getFeed({
      page: currentPage,
      page_size: pageSize,
      category: params.category,
      tag_slug: params.tag_slug,
      source_id: params.source_id,
      min_score: params.min_score,
      max_score: params.max_score,
      search: params.search,
      start_date: params.start_date,
      end_date: params.end_date,
    });

    if (feedData.events && feedData.events.length > 0) {
      allEvents.push(...feedData.events);
      console.log(`Page ${currentPage}: ${feedData.events.length} events, total so far: ${allEvents.length}`);
    }

    totalCount = feedData.total;
    hasMore = feedData.has_next;
    currentPage++;

    // Safety check
    if (allEvents.length >= maxTotal) {
      console.log(`Reached max total limit (${maxTotal}), stopping.`);
      break;
    }
  }

  console.log(`Fetch complete: ${allEvents.length} events fetched (API reported total: ${totalCount})`);
  return allEvents;
}
