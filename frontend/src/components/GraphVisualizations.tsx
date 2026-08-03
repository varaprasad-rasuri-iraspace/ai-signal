"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGraph, GraphData, getFeed } from "../lib/api";
import { 
  Network, 
  BarChart3, 
  TrendingUp, 
  PieChart,
  ChevronDown,
  Loader
} from "lucide-react";
import NeuralGraph from "./NeuralGraph";

type GraphType = "neural" | "timeline" | "category" | "score";

interface GraphVisualizationsProps {
  days?: number;
  limit?: number;
  minScore?: number;
  maxScore?: number;
  category?: string | null;
  tagSlug?: string | null;
  sourceId?: string | null;
  search?: string;
  showTodayOnly?: boolean;
  dateRange?: "all" | "today" | "7days" | "15days" | "30days" | "90days";
}

interface ChartNode {
  id: string;
  title: string;
  category?: string | null;
  importance_score: number;
  published_at: string;
}

export default function GraphVisualizations({ 
  days = 30, 
  limit = 1000,
  minScore = 0,
  maxScore,
  category,
  tagSlug,
  sourceId,
  search,
  showTodayOnly = false,
  dateRange = "all"
}: GraphVisualizationsProps) {
  const [graphType, setGraphType] = useState<GraphType>("neural");
  const [chartData, setChartData] = useState<ChartNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);

  // Load graph data - use feed endpoint for consistency with main timeline
  useEffect(() => {
    async function loadData() {
      setIsRefreshing(true);
      try {
        console.log("Loading visualization data with filters:", { 
          limit, minScore, maxScore, category, tagSlug, sourceId, search, showTodayOnly, dateRange 
        });
        
        // Calculate date range for backend filtering (same logic as page.tsx)
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (showTodayOnly) {
          // Use user's local timezone for "today"
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        } else if (dateRange !== "all") {
          const now = new Date();
          endDate = new Date();
          startDate = new Date();
          
          switch (dateRange) {
            case "today":
              // Use user's local timezone for "today"
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
              endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
              break;
            case "7days":
              startDate.setDate(startDate.getDate() - 7);
              break;
            case "30days":
              startDate.setDate(startDate.getDate() - 30);
              break;
            case "90days":
              startDate.setDate(startDate.getDate() - 90);
              break;
          }
        }
        
        // Fetch data in chunks since page_size max is 100
        const allEvents = [];
        let page = 1;
        let hasMore = true;
        const pageSize = 100; // Max allowed by backend
        
        while (hasMore && allEvents.length < limit) {
          const feedData = await getFeed({ 
            page,
            page_size: pageSize,
            min_score: minScore,
            max_score: maxScore,
            category: category || undefined,
            tag_slug: tagSlug || undefined,
            source_id: sourceId || undefined,
            search: search || undefined,
            start_date: startDate,
            end_date: endDate
          });
          
          if (feedData.events && feedData.events.length > 0) {
            allEvents.push(...feedData.events);
          }
          
          hasMore = feedData.has_next && allEvents.length < limit;
          page++;
        }
        
        console.log("Feed data received:", allEvents.length, "events");
        
        // No need for client-side filtering anymore - backend handles it
        const filteredEvents = allEvents;
        
        console.log("Chart data after filtering:", filteredEvents.length, "events");
        
        // Store the total filtered count
        setTotalFilteredCount(filteredEvents.length);
        
        if (filteredEvents.length > 0) {
          const nodes = filteredEvents.slice(0, limit).map(e => ({
            id: e.id,
            title: e.title,
            category: e.category,
            importance_score: e.importance_score,
            published_at: e.published_at
          }));
          setChartData(nodes);
          console.log("Chart data set with", nodes.length, "nodes (total filtered:", filteredEvents.length, ")");
        } else {
          console.log("No events after filtering");
          setChartData([]);
        }
      } catch (error) {
        console.error("Failed to load visualization data:", error);
        setChartData([]);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
    loadData();
  }, [limit, minScore, maxScore, category, tagSlug, sourceId, search, showTodayOnly, dateRange]);

  const graphOptions = [
    { 
      id: "neural" as const, 
      label: "Neural Network", 
      icon: Network,
      description: "Interactive node-link diagram showing event relationships"
    },
    { 
      id: "timeline" as const, 
      label: "Timeline", 
      icon: TrendingUp,
      description: "Events over time with importance scores"
    },
    { 
      id: "category" as const, 
      label: "By Category", 
      icon: BarChart3,
      description: "Distribution of events across categories"
    },
    { 
      id: "score" as const, 
      label: "Score Distribution", 
      icon: PieChart,
      description: "Importance score breakdown"
    },
  ];

  const renderTimelineChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No data available</p>
            <p className="text-xs text-gray-500">Try adjusting the date range or score filter</p>
          </div>
        </div>
      );
    }

    // Group events by date
    const eventsByDate: { [key: string]: number } = {};
    chartData.forEach(node => {
      const date = new Date(node.published_at).toLocaleDateString();
      eventsByDate[date] = (eventsByDate[date] || 0) + 1;
    });

    const dates = Object.keys(eventsByDate).sort();
    const maxCount = Math.max(...Object.values(eventsByDate));

    return (
      <div className="p-6">
        <div className="space-y-4">
          {dates.slice(-14).map((date, idx) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4"
            >
              <span className="text-xs text-gray-400 w-24">{date}</span>
              <div className="flex-1 bg-[#0a0a14] rounded-lg overflow-hidden h-8 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(eventsByDate[date] / maxCount) * 100}%` }}
                  transition={{ delay: idx * 0.05 + 0.2, duration: 0.6 }}
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-lg"
                />
              </div>
              <span className="text-sm text-primary font-mono w-12 text-right">
                {eventsByDate[date]}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderCategoryChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No data available</p>
            <p className="text-xs text-gray-500">Try adjusting the date range or score filter</p>
          </div>
        </div>
      );
    }

    // Count by category
    const categoryCount: { [key: string]: number } = {};
    const categoryColors: { [key: string]: string } = {
      product: "#00ff88",
      research: "#00ccff",
      funding: "#ffcc00",
      announcement: "#ff00ff",
      tool: "#ff8800",
      other: "#888888"
    };

    chartData.forEach(node => {
      const cat = node.category || "other";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const categories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...categories.map(c => c[1]));

    return (
      <div className="p-6">
        <div className="space-y-4">
          {categories.map(([category, count], idx) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-2 w-32">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryColors[category] || "#888888" }}
                />
                <span className="text-sm text-gray-300 capitalize">{category}</span>
              </div>
              <div className="flex-1 bg-[#0a0a14] rounded-lg overflow-hidden h-8 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxCount) * 100}%` }}
                  transition={{ delay: idx * 0.05 + 0.2, duration: 0.6 }}
                  className="h-full rounded-lg"
                  style={{ backgroundColor: categoryColors[category] || "#888888" }}
                />
              </div>
              <span className="text-sm text-primary font-mono w-12 text-right">
                {count}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderScoreDistribution = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No data available</p>
            <p className="text-xs text-gray-500">Try adjusting the date range or score filter</p>
          </div>
        </div>
      );
    }

    // Create score buckets
    const buckets = [
      { range: "0-20", min: 0, max: 20, color: "#888888" },
      { range: "20-40", min: 20, max: 40, color: "#ff8800" },
      { range: "40-60", min: 40, max: 60, color: "#ffcc00" },
      { range: "60-80", min: 60, max: 80, color: "#00ccff" },
      { range: "80-100", min: 80, max: 100, color: "#00ff88" },
    ];

    const scoreCounts = buckets.map(bucket => ({
      ...bucket,
      count: chartData.filter(
        n => n.importance_score >= bucket.min && n.importance_score < bucket.max
      ).length
    }));

    const maxCount = Math.max(...scoreCounts.map(s => s.count));
    const total = chartData.length;

    return (
      <div className="p-6">
        <div className="space-y-4">
          {scoreCounts.map((bucket, idx) => (
            <motion.div
              key={bucket.range}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4"
            >
              <span className="text-sm text-gray-300 w-16">{bucket.range}</span>
              <div className="flex-1 bg-[#0a0a14] rounded-lg overflow-hidden h-8 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(bucket.count / maxCount) * 100}%` }}
                  transition={{ delay: idx * 0.05 + 0.2, duration: 0.6 }}
                  className="h-full rounded-lg"
                  style={{ backgroundColor: bucket.color }}
                />
              </div>
              <div className="text-right w-20">
                <span className="text-sm text-primary font-mono">{bucket.count}</span>
                <span className="text-xs text-gray-500 ml-1">
                  ({((bucket.count / total) * 100).toFixed(0)}%)
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  if (loading && graphType === "neural") {
    return (
      <div className="neon-card rounded-2xl p-8 flex items-center justify-center h-[500px]">
        <div className="text-center">
          <Loader className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading visualizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="neon-card rounded-2xl overflow-hidden">
      {/* Header with Graph Type Selector */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(0,255,136,0.1)]">
        <div className="flex items-center gap-3">
          {graphOptions.find(g => g.id === graphType)?.icon && 
            (() => {
              const Icon = graphOptions.find(g => g.id === graphType)!.icon;
              return <Icon className="w-5 h-5 text-primary" />;
            })()
          }
          <div>
            <h3 className="text-lg font-semibold">
              {graphOptions.find(g => g.id === graphType)?.label}
            </h3>
            <p className="text-xs text-gray-500">
              {graphOptions.find(g => g.id === graphType)?.description}
              {totalFilteredCount > 0 && (
                <span className="ml-2 text-primary font-medium">
                  ({totalFilteredCount} {totalFilteredCount === 1 ? 'event' : 'events'})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all">
            <span className="text-sm font-medium">Change View</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute right-0 mt-2 w-56 bg-[#0a0a14] border border-primary/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
          >
            {graphOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setGraphType(option.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  graphType === option.id
                    ? "bg-primary/20 text-primary border-l-2 border-primary"
                    : "text-gray-300 hover:bg-primary/10 border-l-2 border-transparent"
                }`}
              >
                <option.icon className="w-4 h-4" />
                <div>
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={graphType}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {graphType === "neural" && (
            <div className="h-[500px]">
              <NeuralGraph 
                days={days} 
                limit={limit} 
                minScore={minScore}
                maxScore={maxScore}
                category={category}
                tagSlug={tagSlug}
                sourceId={sourceId}
                search={search}
                showTodayOnly={showTodayOnly}
                dateRange={dateRange}
              />
            </div>
          )}
          {graphType === "timeline" && (
            <div className="h-[500px] overflow-y-auto">
              {renderTimelineChart()}
            </div>
          )}
          {graphType === "category" && (
            <div className="h-[500px] overflow-y-auto">
              {renderCategoryChart()}
            </div>
          )}
          {graphType === "score" && (
            <div className="h-[500px] overflow-y-auto">
              {renderScoreDistribution()}
            </div>
          )}
          
          {/* Loading Overlay */}
          <AnimatePresence>
            {isRefreshing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0a0a14]/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-40"
              >
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-300 font-medium">Refreshing data...</p>
                  <p className="text-xs text-gray-500 mt-1">Applying filters</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
