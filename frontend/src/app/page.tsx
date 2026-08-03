"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFeed, getStats, getRadarSignals, getSources } from "../lib/api";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import GraphVisualizations from "../components/GraphVisualizations";
import LoadingSpinner from "../components/LoadingSpinner";
import RefreshButton from "../components/RefreshButton";
import { 
  Radar, 
  Activity, 
  TrendingUp, 
  Search, 
  Clock,
  Zap,
  ExternalLink,
  Tag as TagIcon,
  X,
  SlidersHorizontal,
  Sparkles,
  Network,
  LayoutGrid,
  List
} from "lucide-react";

type ViewMode = "timeline" | "graph";

export default function Home() {
  // Client-side only flag to prevent SSR issues
  const [isMounted, setIsMounted] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper function to strip HTML tags and clean text
  const stripHtml = (html: string | null): string => {
    if (!html) return '';
    
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');
    
    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")  // Hex apostrophe
      .replace(/&#x2F;/g, "/")  // Hex forward slash
      .replace(/&apos;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/&lsquo;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&times;/g, '×')
      .replace(/&divide;/g, '÷')
      .replace(/&copy;/g, '©')
      .replace(/&reg;/g, '®')
      .replace(/&trade;/g, '™');
    
    // Decode any remaining numeric entities (&#123; or &#xAB;)
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)));
    text = text.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    
    // Remove arXiv metadata patterns
    text = text.replace(/arXiv:\d+\.\d+v?\d*\s*/gi, '');
    text = text.replace(/Announce Type:\s*\w+\s*/gi, '');
    text = text.replace(/Abstract:\s*/gi, '');
    text = text.replace(/cross Abstract[:\s]*/gi, '');
    text = text.replace(/new Abstract[:\s]*/gi, '');
    text = text.replace(/replace Abstract[:\s]*/gi, '');
    
    // Remove common metadata patterns
    text = text.replace(/\[Submitted on.*?\]/gi, '');
    text = text.replace(/Comments:.*?(?=\n|$)/gi, '');
    text = text.replace(/Subjects:.*?(?=\n|$)/gi, '');
    
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  };

  // Get clean summary for display (limited to 2 lines / ~150 chars)
  const getCleanSummary = (event: any): string => {
    // Try summary first
    if (event.summary) {
      const cleaned = stripHtml(event.summary);
      if (cleaned.length > 10) {
        // Limit to ~150 characters for 2 lines
        return cleaned.length > 150 ? cleaned.substring(0, 150) + '...' : cleaned;
      }
    }
    
    // Try content if summary is empty
    if (event.content) {
      const cleaned = stripHtml(event.content);
      if (cleaned.length > 10) {
        // Limit to ~150 characters for 2 lines
        return cleaned.length > 150 ? cleaned.substring(0, 150) + '...' : cleaned;
      }
    }
    
    // Fallback to title
    const titleCleaned = stripHtml(event.title);
    return titleCleaned.length > 150 ? titleCleaned.substring(0, 150) + '...' : titleCleaned;
  };

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-red-500/20 border-red-500/40 text-red-400';
    toast.className = `fixed top-4 right-4 ${bgColor} border px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    toast.style.opacity = '0';
    
    const icon = type === 'success' 
      ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
      : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        ${icon}
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"published_at" | "importance_score">("published_at");
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(25);
  const [customDisplayLimit, setCustomDisplayLimit] = useState(false); // Track if display limit was manually set
  const [dateRange, setDateRange] = useState<"today" | "7days" | "15days">("today");

  // Pagination state - store loaded pages of events
  const [allLoadedEvents, setAllLoadedEvents] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Sync dateRange and showTodayOnly - they should not conflict
  useEffect(() => {
    if (dateRange === "today") {
      // If user selects "today" from dropdown, set showTodayOnly
      setShowTodayOnly(true);
    } else {
      // For any other range (7days, 15days, 30days), clear showTodayOnly
      setShowTodayOnly(false);
    }
  }, [dateRange]);

  // When showTodayOnly is set via button, update dateRange
  useEffect(() => {
    if (showTodayOnly) {
      setDateRange("today");
    }
  }, [showTodayOnly]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset display limit when filters change (except when explicitly set by high-priority filter)
  useEffect(() => {
    // Don't reset if we have a custom display limit set
    if (!customDisplayLimit) {
      setDisplayLimit(25);
    }
  }, [selectedCategory, selectedTag, selectedSource, minScore, maxScore, debouncedSearch, showTodayOnly, dateRange]);

  // Build query key based on all filters
  const queryKey = [
    "feed", 
    selectedCategory, 
    selectedTag, 
    selectedSource,
    minScore, 
    maxScore,
    sortBy,
    debouncedSearch,
    showTodayOnly,
    dateRange
  ];

  // Build date params (UTC-based to match backend)
  const getDateParams = () => {
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const now = new Date();

    if (showTodayOnly || dateRange === "today") {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    } else {
      endDate = new Date();
      startDate = new Date(endDate);
      
      switch (dateRange) {
        case "7days":
          startDate.setUTCDate(startDate.getUTCDate() - 7);
          break;
        case "15days":
          startDate.setUTCDate(startDate.getUTCDate() - 15);
          break;
      }
    }
    
    return { startDate, endDate };
  };

  // Fetch data - FAST INITIAL LOAD: only fetch first page (25 items)
  // This ensures the page loads within 5 seconds
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { startDate, endDate } = getDateParams();
      
      // FAST LOAD: Only fetch first page with 25 items
      const feedResponse = await getFeed({
        page: 1,
        page_size: 25, // Small page size for fast initial load
        category: selectedCategory || undefined,
        tag_slug: selectedTag || undefined,
        source_id: selectedSource || undefined,
        min_score: minScore ?? undefined,
        max_score: maxScore ?? undefined,
        search: debouncedSearch || undefined,
        start_date: startDate,
        end_date: endDate,
      });

      console.log(`Fast load: ${feedResponse.events?.length || 0} events (total: ${feedResponse.total})`);
      
      return feedResponse;
    },
    enabled: isMounted,
    refetchInterval: (query) => {
      // If no data yet, refetch every 5 seconds to check for new ingested data
      return (!query.state.data || query.state.data.total === 0) ? 5000 : false;
    },
  });

  // Build date params for stats based on current dateRange (UTC-based)
  const getStatsDateParams = () => {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (dateRange) {
      case "today":
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        break;
      case "7days":
        startDate = new Date(now);
        startDate.setUTCDate(startDate.getUTCDate() - 7);
        break;
      case "15days":
      default:
        startDate = new Date(now);
        startDate.setUTCDate(startDate.getUTCDate() - 15);
        break;
    }

    return { startDate, endDate };
  };

  const { data: stats } = useQuery({
    queryKey: ["stats", dateRange],
    queryFn: () => {
      const { startDate, endDate } = getStatsDateParams();
      return getStats({ start_date: startDate, end_date: endDate });
    },
    enabled: isMounted,
    refetchInterval: (query) => {
      // If no events yet, refetch every 5 seconds
      return (!query.state.data || query.state.data.total_events === 0) ? 5000 : false;
    },
  });

  // Debug: Log stats to understand what's being displayed
  useEffect(() => {
    if (stats) {
      const rangeLabel = dateRange === 'today' ? 'Today' : dateRange === '7days' ? '7 days' : '15 days';
      console.group('📊 Stats Debug Info');
      console.log(`Events (${rangeLabel}):`, stats.total_events, `← Events from selected range`);
      console.log('Today:', stats.events_today, '← Events from today only (midnight to now)');
      console.log('Sources:', stats.total_sources, '← Total active sources');
      console.log('Avg Score:', stats.avg_importance_score?.toFixed(2), '← Average importance score (0-100)');
      console.log('Category Breakdown:', stats.category_breakdown);
      console.log('Top Tags:', stats.top_tags?.slice(0, 5).map(t => t.name));
      console.groupEnd();
    }
  }, [stats, dateRange]);

  const { data: radarSignals } = useQuery({
    queryKey: ["radar"],
    queryFn: () => getRadarSignals(10),
    enabled: isMounted,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: 60000, // Refetch every minute to keep scores in sync
  });

  // Debug: Log radar signals to understand high priority count
  useEffect(() => {
    if (radarSignals) {
      const highPriority = radarSignals.filter(s => s.importance_score >= 50);
      const mediumPriority = radarSignals.filter(s => s.importance_score >= 35 && s.importance_score < 50);
      const lowPriority = radarSignals.filter(s => s.importance_score < 35);
      
      console.group('📡 Radar Signals Debug');
      console.log('Total signals (last 30 days):', radarSignals.length);
      console.log('High Priority (≥50):', highPriority.length);
      console.log('Medium Priority (35-49):', mediumPriority.length);
      console.log('Low Priority (<35):', lowPriority.length);
      console.log('High Priority %:', ((highPriority.length / radarSignals.length) * 100).toFixed(1) + '%');
      console.log('Average score:', (radarSignals.reduce((sum, s) => sum + s.importance_score, 0) / radarSignals.length).toFixed(2));
      console.log('Score distribution:', {
        '90-100': radarSignals.filter(s => s.importance_score >= 90).length,
        '80-89': radarSignals.filter(s => s.importance_score >= 80 && s.importance_score < 90).length,
        '70-79': radarSignals.filter(s => s.importance_score >= 70 && s.importance_score < 80).length,
        '60-69': radarSignals.filter(s => s.importance_score >= 60 && s.importance_score < 70).length,
        '50-59': radarSignals.filter(s => s.importance_score >= 50 && s.importance_score < 60).length,
        '40-49': radarSignals.filter(s => s.importance_score >= 40 && s.importance_score < 50).length,
        '30-39': radarSignals.filter(s => s.importance_score >= 30 && s.importance_score < 40).length,
        '<30': radarSignals.filter(s => s.importance_score < 30).length,
      });
      console.groupEnd();
    }
  }, [radarSignals]);

  const { data: sources } = useQuery({
    queryKey: ["sources"],
    queryFn: getSources,
    enabled: isMounted,
  });

  // Invalidate radar cache when feed data changes to keep scores in sync
  useEffect(() => {
    if (feedData) {
      queryClient.invalidateQueries({ queryKey: ["radar"] });
    }
  }, [feedData, queryClient]);

  // Auto-trigger ingestion on page load if no events today
  useEffect(() => {
    if (isMounted && stats && stats.events_today === 0 && stats.total_events > 0) {
      // Only trigger once on initial load
      const triggerIngestion = async () => {
        try {
          console.log("Auto-triggering ingestion - no events today");
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/jobs/trigger`,
            { method: 'POST' }
          );
          const result = await response.json();
          console.log("Ingestion triggered:", result.message);
          
          // Refetch stats after a delay to get updated today count
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            queryClient.invalidateQueries({ queryKey: ["feed"] });
          }, 3000);
        } catch (error) {
          console.error("Failed to auto-trigger ingestion:", error);
        }
      };
      
      triggerIngestion();
    }
  }, [isMounted, stats?.events_today, stats?.total_events, queryClient]);

  // Category definitions
  const categories = [
    { id: null, name: "All", icon: Activity },
    { id: "research", name: "Research", icon: TrendingUp },
    { id: "product", name: "Product", icon: Zap },
    { id: "funding", name: "Funding", icon: TagIcon },
    { id: "announcement", name: "News", icon: Clock },
    { id: "tool", name: "Tools", icon: Sparkles },
  ];

  // Sort options
  const sortOptions = [
    { value: "published_at", label: "Most Recent" },
    { value: "importance_score", label: "Highest Score" },
  ];

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedTag(null);
    setSelectedSource(null);
    setMinScore(null);
    setMaxScore(null);
    setSortBy("published_at");
    setShowTodayOnly(false);
    setDisplayLimit(25);
    setCustomDisplayLimit(false);
    setDateRange("today"); // Default to today
  };

  // Count active filters (excluding default dateRange)
  const activeFilterCount = [
    selectedCategory,
    selectedTag,
    selectedSource,
    minScore,
    maxScore,
    debouncedSearch,
    dateRange !== "today" ? dateRange : null  // Only count dateRange if changed from default
  ].filter(Boolean).length;

  // Handle radar signal click - jump to event in timeline
  const handleSignalClick = (eventId: string) => {
    // Switch to timeline view if in graph view
    if (viewMode === "graph") {
      setViewMode("timeline");
    }
    
    // Clear ALL filters to ensure event is visible
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedTag(null);
    setSelectedSource(null);
    setMinScore(null);
    setMaxScore(null);
    setSortBy("published_at");
    
    // Highlight the event
    setHighlightedEventId(eventId);
    
    // Wait for view to render and filters to clear, then scroll to event
    setTimeout(() => {
      const element = document.getElementById(`event-${eventId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedEventId(null), 3000);
      } else {
        // Event not in current page - it might be on page 2+
        // Clear filters and show message
        showToast('Clearing filters to show this event...', 'success');
        
        // Try again after a longer delay to let the feed reload
        setTimeout(() => {
          const retryElement = document.getElementById(`event-${eventId}`);
          if (retryElement) {
            retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            // Still not found - might need pagination
            showToast('Event found! It may be on the next page. Scroll down to load more.', 'success');
          }
        }, 800);
      }
    }, 400);
  };

  // Filter by today's events
  const handleTodayFilter = () => {
    setViewMode("timeline");
    clearFilters(); // Clear all other filters first
    setShowTodayOnly(true);
    const count = stats?.events_today || 0;
    showToast(`Showing ${count} events from today`);
    setSortBy("published_at");
  };

  // Handle category selection - clear other filters
  const handleCategoryClick = (categoryId: string | null) => {
    if (categoryId === null) {
      // "All" category - clear all filters
      clearFilters();
    } else {
      // Specific category - clear other filters but keep this one
      setSearchQuery("");
      setSelectedTag(null);
      setSelectedSource(null);
      setMinScore(null);
      setMaxScore(null);
      setShowTodayOnly(false);
      setDisplayLimit(25);
      setCustomDisplayLimit(false);
      setSelectedCategory(categoryId);
      
      const categoryName = categories.find(c => c.id === categoryId)?.name || categoryId;
      const count = stats?.category_breakdown?.[categoryId] || 0;
      showToast(`Showing ${count} ${categoryName} events`);
    }
  };

  // Handle tag selection - clear other filters
  const handleTagClick = (tagSlug: string) => {
    if (selectedTag === tagSlug) {
      // Clicking same tag - deselect it and clear all filters
      clearFilters();
    } else {
      // New tag - clear other filters but keep this one
      setSearchQuery("");
      setSelectedCategory(null);
      setSelectedSource(null);
      setMinScore(null);
      setMaxScore(null);
      setShowTodayOnly(false);
      setDisplayLimit(25);
      setCustomDisplayLimit(false);
      setSelectedTag(tagSlug);
      
      const tagName = stats?.top_tags?.find(t => t.slug === tagSlug)?.name || tagSlug;
      showToast(`Filtering by #${tagName}`);
    }
  };

  // Filter by high priority events
  const handleHighPriorityFilter = () => {
    setViewMode("timeline");
    clearFilters();
    setMinScore(50);
    const count = radarSignals?.filter(s => s.importance_score >= 50).length || 0;
    // Set display limit to exact count of high-priority events
    setDisplayLimit(count > 0 ? count : 25);
    setCustomDisplayLimit(true); // Mark that we set a custom limit
    showToast(`Showing ${count} high-priority events (score ≥50)`);
    setSortBy("importance_score");
  };

  // Load more events - manually load next 25 and display them
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !feedData?.has_next) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      const { startDate, endDate } = getDateParams();
      
      const response = await getFeed({
        page: nextPage,
        page_size: 25,
        category: selectedCategory || undefined,
        tag_slug: selectedTag || undefined,
        source_id: selectedSource || undefined,
        min_score: minScore ?? undefined,
        max_score: maxScore ?? undefined,
        search: debouncedSearch || undefined,
        start_date: startDate,
        end_date: endDate,
      });
      
      // Add new events to the loaded list
      setAllLoadedEvents(prev => [...prev, ...(response.events || [])]);
      setCurrentPage(nextPage);
      setHasMorePages(response.has_next);
      
      console.log(`Loaded page ${nextPage}: ${response.events?.length || 0} more events`);
    } catch (error) {
      console.error('Failed to load more events:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, currentPage, feedData, selectedCategory, selectedTag, selectedSource, minScore, maxScore, debouncedSearch, showTodayOnly, dateRange]);

  // Reset pagination state when filters change
  useEffect(() => {
    setCurrentPage(1);
    setAllLoadedEvents([]);
    setHasMorePages(true);
  }, [selectedCategory, selectedTag, selectedSource, minScore, maxScore, debouncedSearch, showTodayOnly, dateRange]);

  // Manual load more function - no auto-loading
  const handleManualLoadMore = useCallback(async () => {
    if (isLoadingMore || !feedData?.has_next) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      const { startDate, endDate } = getDateParams();
      
      const response = await getFeed({
        page: nextPage,
        page_size: 25,
        category: selectedCategory || undefined,
        tag_slug: selectedTag || undefined,
        source_id: selectedSource || undefined,
        min_score: minScore ?? undefined,
        max_score: maxScore ?? undefined,
        search: debouncedSearch || undefined,
        start_date: startDate,
        end_date: endDate,
      });
      
      setAllLoadedEvents(prev => [...prev, ...(response.events || [])]);
      setCurrentPage(nextPage);
      setHasMorePages(response.has_next);
      
      console.log(`Loaded page ${nextPage}: ${response.events?.length || 0} more events`);
    } catch (error) {
      console.error('Failed to load more events:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, currentPage, feedData, selectedCategory, selectedTag, selectedSource, minScore, maxScore, debouncedSearch, showTodayOnly, dateRange]);

  // Get displayed events (combine feed data with additional loaded pages)
  const displayedEvents = feedData?.events 
    ? [...feedData.events, ...allLoadedEvents].slice(0, displayLimit) 
    : allLoadedEvents.slice(0, displayLimit);
  
  // Check if there are more events to load
  const totalLoaded = (feedData?.events?.length || 0) + allLoadedEvents.length;
  const hasMoreEvents = feedData && totalLoaded < feedData.total;

  // Calculate overall loading state
  const isLoading = feedLoading;

  return (
    <div className="min-h-screen grid-bg">
      {/* Loading Spinner */}
      <LoadingSpinner isLoading={isLoading} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a14]/95 backdrop-blur-md border-b border-[rgba(0,255,136,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Radar className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-50" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold gradient-text">AI Signal</h1>
                <p className="text-xs text-gray-400">Live AI Radar</p>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search AI developments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a0a14]/80 border border-[rgba(0,255,136,0.2)] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-gray-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
              <div className="text-center px-3">
                <p className="text-xl font-bold text-primary">{stats?.total_events || 0}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Events</p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <button
                onClick={handleTodayFilter}
                className="text-center px-3 rounded-lg hover:bg-secondary/10 transition-all cursor-pointer group"
                title="Click to show today's events"
              >
                <p className="text-xl font-bold text-secondary group-hover:scale-110 transition-transform">{stats?.events_today || 0}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider group-hover:text-secondary transition-colors">Today</p>
              </button>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center px-3">
                <p className="text-xl font-bold text-accent">{stats?.total_sources || 0}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sources</p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <RefreshButton 
                onRefresh={() => {
                  queryClient.invalidateQueries({ queryKey: ["stats"] });
                  queryClient.invalidateQueries({ queryKey: ["feed"] });
                  queryClient.invalidateQueries({ queryKey: ["radar"] });
                }}
                showLastUpdated={true}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="lg:w-80 flex-shrink-0 space-y-4">
            {/* Radar Card */}
            <div className="neon-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Radar className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Live Radar</h2>
                </div>
                <div className="relative group">
                  <span className="text-xs text-gray-400 bg-primary/10 px-2 py-1 rounded-full cursor-help">
                    {radarSignals?.length || 0} signals
                  </span>
                  {/* Tooltip */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a14] border border-primary/30 rounded-lg p-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <p className="text-gray-300 mb-2">Signal Priority Levels:</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-gray-400">High (≥50)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-secondary"></div>
                        <span className="text-gray-400">Medium (35-49)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                        <span className="text-gray-400">Lower (&lt;35)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                Click any signal to jump to event
              </p>
              
              {/* Radar Animation */}
              <div className="relative h-40 rounded-xl overflow-hidden bg-[#0a0a14] mb-3">
                <div className="absolute inset-0 radar-sweep opacity-30" />
                <button
                  onClick={handleHighPriorityFilter}
                  className="absolute inset-0 flex items-center justify-center hover:bg-primary/5 transition-all cursor-pointer group"
                  title="Click to show high-priority events"
                >
                  <div className="text-center z-10">
                    <p className="text-4xl font-bold text-primary group-hover:scale-110 transition-transform">
                      {radarSignals?.filter(s => s.importance_score >= 50).length || 0}
                    </p>
                    <p className="text-xs text-gray-400 group-hover:text-primary transition-colors">High Priority</p>
                    <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-gray-500">{radarSignals?.filter(s => s.importance_score >= 50).length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-secondary"></div>
                        <span className="text-gray-500">{radarSignals?.filter(s => s.importance_score >= 35 && s.importance_score < 50).length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                        <span className="text-gray-500">{radarSignals?.filter(s => s.importance_score < 35).length || 0}</span>
                      </div>
                    </div>
                    <p className="text-xs text-primary/70 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to filter
                    </p>
                  </div>
                </button>
                {/* Concentric rings */}
                <div className="absolute inset-0 border border-primary/10 rounded-full m-auto w-3/4 h-3/4 pointer-events-none" />
                <div className="absolute inset-0 border border-primary/10 rounded-full m-auto w-1/2 h-1/2 pointer-events-none" />
                <div className="absolute inset-0 border border-primary/20 rounded-full m-auto w-1/4 h-1/4 pointer-events-none" />
              </div>
              
              {/* Signal List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {radarSignals?.slice(0, 5).map((signal, i) => (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSignalClick(signal.id)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/10 transition-all cursor-pointer group border border-transparent hover:border-primary/30"
                    title="Click to view event details"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform"
                        style={{
                          backgroundColor: signal.importance_score >= 50 
                            ? '#00ff88' 
                            : signal.importance_score >= 35 
                              ? '#00ccff' 
                              : '#ff00ff'
                        }}
                      />
                      <span className="text-sm truncate group-hover:text-primary transition-colors">
                        {signal.title}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-primary flex-shrink-0 ml-2 group-hover:scale-110 transition-transform">
                      {signal.importance_score.toFixed(0)}
                    </span>
                  </motion.div>
                ))}
                {(!radarSignals || radarSignals.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Waiting for signals...
                  </p>
                )}
              </div>
            </div>

            {/* Scoring Explanation */}
            <div className="neon-card rounded-2xl p-5">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Importance Score
              </h2>
              <p className="text-xs text-gray-400 mb-3">
                Events are scored 0-100 based on multiple factors:
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-gray-300 font-medium">Source Reliability</span>
                    <p className="text-gray-500">Research papers (20pts), Blogs (15pts), News (10pts)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-gray-300 font-medium">Category Weight</span>
                    <p className="text-gray-500">Research (1.5x), Funding (1.3x), Product (1.2x)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-gray-300 font-medium">Keywords</span>
                    <p className="text-gray-500">AGI (+10), GPT/LLM (+7), OpenAI/Anthropic (+8)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-gray-300 font-medium">Freshness</span>
                    <p className="text-gray-500">Recent events score higher (time decay)</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[rgba(0,255,136,0.1)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Score Range:</span>
                  <span className="text-primary font-mono">0 - 100</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-400">High Priority:</span>
                  <span className="text-primary font-mono">≥ 50</span>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="neon-card rounded-2xl p-5">
              <h2 className="text-lg font-semibold mb-4">Categories</h2>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  const count = cat.id 
                    ? stats?.category_breakdown?.[cat.id] 
                    : stats?.total_events;
                  
                  return (
                    <button
                      key={cat.id || "all"}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                        isActive
                          ? "bg-primary/20 border border-primary/30"
                          : "hover:bg-[#0a0a14] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                        <span className={`font-medium ${isActive ? 'text-primary' : 'text-gray-300'}`}>
                          {cat.name}
                        </span>
                      </div>
                      {count !== undefined && (
                        <span className="text-xs text-gray-500 bg-[#0a0a14] px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trending Topics */}
            <div className="neon-card rounded-2xl p-5">
              <h2 className="text-lg font-semibold mb-4">Trending Topics</h2>
              <div className="flex flex-wrap gap-2">
                {stats?.top_tags?.slice(0, 20).map((tag, i) => (
                  <motion.button
                    key={tag.slug}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleTagClick(tag.slug)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                      selectedTag === tag.slug
                        ? "bg-secondary/20 text-secondary border border-secondary/40"
                        : "bg-secondary/5 text-secondary/70 border border-secondary/20 hover:bg-secondary/10"
                    }`}
                  >
                    {tag.name}
                  </motion.button>
                ))}
                {(!stats?.top_tags || stats.top_tags.length === 0) && (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-500 mb-1">No trending topics yet</p>
                    <p className="text-xs text-gray-600">Tags will appear as events are processed</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* View Toggle & Filter Bar */}
            <div className="neon-card rounded-2xl p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                {/* View Toggle */}
                <div className="flex items-center bg-[#0a0a14] rounded-xl p-1">
                  <button
                    onClick={() => setViewMode("timeline")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      viewMode === "timeline"
                        ? "bg-primary/20 text-primary"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span className="font-medium">Timeline</span>
                  </button>
                  <button
                    onClick={() => setViewMode("graph")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      viewMode === "graph"
                        ? "bg-primary/20 text-primary"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <Network className="w-4 h-4" />
                    <span className="font-medium">Graph</span>
                  </button>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    showFilters || activeFilterCount > 1
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-[#0a0a14] text-gray-400 border border-transparent hover:border-primary/20"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="font-medium">Filters</span>
                  {activeFilterCount > 1 && (
                    <span className="text-xs bg-primary/30 px-1.5 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#0a0a14] border border-[rgba(0,255,136,0.2)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <div className="flex-1" />

                {/* Results count - only show when not default */}
                {activeFilterCount > 0 && (
                  <span className="text-sm text-gray-400">
                    {feedData?.total || 0} results
                  </span>
                )}

                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>

              {/* Expanded Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-[rgba(0,255,136,0.1)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Date Range Filter */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Date Range</label>
                        <select
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value as any)}
                          className="w-full bg-[#0a0a14] border border-[rgba(0,255,136,0.2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="today">Today</option>
                          <option value="7days">Last 7 Days</option>
                          <option value="15days">Last 15 Days</option>
                        </select>
                      </div>
                      
                      {/* Score Range */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Importance Score</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={minScore || ""}
                            onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-[#0a0a14] border border-[rgba(0,255,136,0.2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={maxScore || ""}
                            onChange={(e) => setMaxScore(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-[#0a0a14] border border-[rgba(0,255,136,0.2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      {/* Source Filter */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Source</label>
                        <select
                          value={selectedSource || ""}
                          onChange={(e) => setSelectedSource(e.target.value || null)}
                          className="w-full bg-[#0a0a14] border border-[rgba(0,255,136,0.2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="">All Sources</option>
                          {sources?.map(source => (
                            <option key={source.id} value={source.id}>{source.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Tag Filter */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Tag</label>
                        <select
                          value={selectedTag || ""}
                          onChange={(e) => setSelectedTag(e.target.value || null)}
                          className="w-full bg-[#0a0a14] border border-[rgba(0,255,136,0.2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="">All Tags</option>
                          {stats?.top_tags?.map((tag: { slug: string; name: string }) => (
                            <option key={tag.slug} value={tag.slug}>{tag.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Content based on view mode */}
            <AnimatePresence mode="wait">
              {viewMode === "timeline" ? (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {feedLoading ? (
                    [...Array(5)].map((_, i) => (
                      <div key={i} className="neon-card rounded-2xl p-6 animate-pulse">
                        <div className="flex gap-4">
                          <div className="w-14 h-14 bg-gray-700/50 rounded-xl flex-shrink-0" />
                          <div className="flex-1">
                            <div className="h-6 bg-gray-700/50 rounded w-3/4 mb-3" />
                            <div className="h-4 bg-gray-700/30 rounded w-1/2 mb-2" />
                            <div className="h-4 bg-gray-700/30 rounded w-full" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : feedData?.events?.length === 0 ? (
                    <div className="neon-card rounded-2xl p-12 text-center">
                      <div className="relative inline-block mb-6">
                        <Radar className="w-16 h-16 text-primary/50 mx-auto" />
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                      </div>
                      <p className="text-xl font-semibold text-gray-300 mb-2">
                        {stats?.total_events === 0 ? "Ingesting AI signals..." : "No results found"}
                      </p>
                      <p className="text-gray-500 mb-2">
                        {stats?.total_events === 0 
                          ? "Fetching latest AI developments from sources."
                          : "Try adjusting your filters or search query"}
                      </p>
                      {stats?.total_events === 0 ? (
                        <>
                          <p className="text-sm text-primary/70 mb-4">
                            Please wait, this may take a minute...
                          </p>
                          <div className="flex items-center justify-center gap-2 text-sm text-primary mb-4">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span>Loading data from sources</span>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('http://localhost:8000/jobs/trigger', {
                                  method: 'POST',
                                });
                                const result = await response.json();
                                showToast(result.message || 'Ingestion triggered successfully!');
                              } catch (error) {
                                showToast('Failed to trigger ingestion', 'error');
                              }
                            }}
                            className="px-6 py-2 bg-secondary/10 text-secondary border border-secondary/30 rounded-lg hover:bg-secondary/20 transition-colors"
                          >
                            <Zap className="w-4 h-4 inline mr-2" />
                            Trigger Data Ingestion
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={clearFilters}
                          className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {displayedEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        id={`event-${event.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          scale: highlightedEventId === event.id ? [1, 1.02, 1] : 1
                        }}
                        transition={{ 
                          delay: Math.min(index * 0.03, 0.3),
                          scale: { duration: 0.5, repeat: highlightedEventId === event.id ? 2 : 0 }
                        }}
                        className={`neon-card rounded-2xl p-5 group hover:border-primary/40 transition-all relative ${
                          highlightedEventId === event.id 
                            ? 'ring-4 ring-primary shadow-[0_0_30px_rgba(0,255,136,0.5)] bg-primary/10 border-primary' 
                            : ''
                        }`}
                      >
                        {/* Attention-grabbing pulse effect */}
                        {highlightedEventId === event.id && (
                          <>
                            <motion.div
                              className="absolute inset-0 rounded-2xl border-4 border-primary"
                              animate={{
                                scale: [1, 1.05, 1],
                                opacity: [0.8, 0.3, 0.8],
                              }}
                              transition={{
                                duration: 1,
                                repeat: 2,
                                ease: "easeInOut"
                              }}
                            />
                            <motion.div
                              className="absolute -top-2 -right-2 bg-primary text-[#0a0a14] px-3 py-1 rounded-full text-xs font-bold"
                              animate={{
                                y: [0, -5, 0],
                              }}
                              transition={{
                                duration: 0.5,
                                repeat: 3,
                              }}
                            >
                              ← YOU CLICKED THIS
                            </motion.div>
                          </>
                        )}
                        <div className="flex gap-4">
                          {/* Score Badge */}
                          <div className="flex-shrink-0">
                            <div 
                              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold"
                              style={{
                                backgroundColor: event.importance_score >= 50 
                                  ? 'rgba(0, 255, 136, 0.15)' 
                                  : event.importance_score >= 35 
                                    ? 'rgba(0, 204, 255, 0.15)' 
                                    : 'rgba(255, 0, 255, 0.15)',
                                border: `1px solid ${
                                  event.importance_score >= 50 
                                    ? 'rgba(0, 255, 136, 0.3)' 
                                    : event.importance_score >= 35 
                                      ? 'rgba(0, 204, 255, 0.3)' 
                                      : 'rgba(255, 0, 255, 0.3)'
                                }`
                              }}
                            >
                              <span 
                                className="text-lg"
                                style={{
                                  color: event.importance_score >= 50 
                                    ? '#00ff88' 
                                    : event.importance_score >= 35 
                                      ? '#00ccff' 
                                      : '#ff00ff'
                                }}
                              >
                                {event.importance_score.toFixed(0)}
                              </span>
                              <span className="text-[9px] text-gray-500 uppercase">score</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                {event.title}
                              </h3>
                              <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 p-2 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary transition-all"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>

                            {/* Summary - always show cleaned text */}
                            <p className="text-gray-400 mt-2 line-clamp-2 text-sm leading-relaxed">
                              {getCleanSummary(event)}
                            </p>

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                              {event.category && (
                                <span 
                                  className="px-2.5 py-1 text-xs rounded-full font-medium"
                                  style={{
                                    backgroundColor: 'rgba(0, 204, 255, 0.1)',
                                    color: '#00ccff',
                                    border: '1px solid rgba(0, 204, 255, 0.2)'
                                  }}
                                >
                                  {event.category}
                                </span>
                              )}

                              {event.source && (
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                  {event.source.name}
                                </span>
                              )}

                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDistanceToNow(new Date(event.published_at), { addSuffix: true })}
                              </span>
                            </div>

                            {/* Tags */}
                            {event.tags && event.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {event.tags.map((tag: { id: string; slug: string; name: string }) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => setSelectedTag(tag.slug)}
                                    className="px-2 py-0.5 text-xs rounded-full bg-primary/5 text-primary/70 border border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                                  >
                                    #{tag.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                      {/* Infinite Scroll Trigger & Load More Button */}
                      <div ref={loadMoreRef} className="mt-8 text-center">
                        {isLoadingMore && (
                          <div className="flex items-center justify-center gap-2 py-4">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-400">Loading more events...</span>
                          </div>
                        )}
                        {!isLoadingMore && hasMoreEvents && (
                          <button 
                            onClick={handleLoadMore}
                            className="px-8 py-3 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-all font-medium group"
                          >
                            <span className="flex items-center gap-2">
                              Load More (25 at a time)
                              <span className="text-xs text-gray-400">
                                ({feedData.total - totalLoaded} remaining)
                              </span>
                            </span>
                          </button>
                        )}
                        {!hasMoreEvents && totalLoaded > 0 && (
                          <p className="text-sm text-gray-500 py-4">
                            You've reached the end • {totalLoaded} events loaded
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="graph"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <GraphVisualizations 
                    days={30} 
                    limit={1000} 
                    minScore={minScore || 0}
                    maxScore={maxScore || undefined}
                    category={selectedCategory}
                    tagSlug={selectedTag}
                    sourceId={selectedSource}
                    search={debouncedSearch}
                    showTodayOnly={showTodayOnly}
                    dateRange={dateRange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-800 py-4 sm:py-6 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
                <span>Created with</span>
                <span className="text-red-500">❤️</span>
                <span>by</span>
                <span className="font-semibold text-blue-400">IRASPACE Team</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs text-slate-500">"Stay informed, stay ahead!"</span>
                <span className="text-base sm:text-lg">🚀</span>
              </div>
              <div className="text-xs text-slate-600">
                © {new Date().getFullYear()} IRASPACE
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
