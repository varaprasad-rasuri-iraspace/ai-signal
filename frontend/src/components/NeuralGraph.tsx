"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGraph, GraphNode, GraphData, getFeed } from "../lib/api";
import { Network, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface NeuralGraphProps {
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

export default function NeuralGraph({ 
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
}: NeuralGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load graph data - only on client
  useEffect(() => {
    if (!isMounted) return;
    
    async function loadGraph() {
      setIsRefreshing(true);
      try {
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
        
        // No need for client-side filtering anymore - backend handles it
        const filteredEvents = allEvents;
        
        // Convert feed events to graph format
        if (filteredEvents.length > 0) {
          const nodes = filteredEvents.slice(0, limit).map(e => ({
            id: e.id,
            title: e.title,
            url: e.url,
            category: e.category,
            importance_score: e.importance_score,
            published_at: String(e.published_at),
            source_name: e.source?.name || null
          }));
          
          // For now, create minimal edges (can be enhanced later)
          setGraphData({
            nodes,
            edges: []
          });
        } else {
          setGraphData({ nodes: [], edges: [] });
        }
      } catch (error) {
        console.error("Failed to load graph:", error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
    loadGraph();
  }, [limit, minScore, maxScore, category, tagSlug, sourceId, search, showTodayOnly, dateRange, isMounted]);

  // Draw the graph
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const centerX = canvas.width / 2 + offset.x;
    const centerY = canvas.height / 2 + offset.y;

    // Clear canvas
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate node positions in a circular layout
    const radius = Math.min(canvas.width, canvas.height) * 0.35 * zoom;
    const nodes = graphData.nodes.map((node, index) => {
      const angle = (index / graphData.nodes.length) * Math.PI * 2;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        targetX: centerX + Math.cos(angle) * radius,
        targetY: centerY + Math.sin(angle) * radius,
      };
    });

    // Draw edges first (behind nodes)
    ctx.lineWidth = 1;
    graphData.edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        const gradient = ctx.createLinearGradient(
          sourceNode.x,
          sourceNode.y,
          targetNode.x,
          targetNode.y
        );

        // Color based on relationship type
        if (edge.relationship_type === "same_tag") {
          gradient.addColorStop(0, "rgba(0, 255, 136, 0.3)");
          gradient.addColorStop(1, "rgba(0, 204, 255, 0.3)");
        } else if (edge.relationship_type === "cites") {
          gradient.addColorStop(0, "rgba(255, 0, 255, 0.3)");
          gradient.addColorStop(1, "rgba(255, 0, 255, 0.3)");
        } else {
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
          gradient.addColorStop(1, "rgba(255, 255, 255, 0.15)");
        }

        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const nodeSize = 8 + (node.importance_score / 100) * 12 * zoom;

      // Node color based on category
      let nodeColor = "#00ff88"; // Default green
      if (node.category === "research") {
        nodeColor = "#00ccff"; // Blue
      } else if (node.category === "product") {
        nodeColor = "#00ff88"; // Green
      } else if (node.category === "funding") {
        nodeColor = "#ffcc00"; // Yellow
      } else if (node.category === "announcement") {
        nodeColor = "#ff00ff"; // Magenta
      } else if (node.category === "tool") {
        nodeColor = "#ff8800"; // Orange
      }

      // Draw glow
      const glowGradient = ctx.createRadialGradient(
        node.x,
        node.y,
        0,
        node.x,
        node.y,
        nodeSize * 2
      );
      glowGradient.addColorStop(0, nodeColor + "40");
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize * 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw node
      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();

      // Draw label if zoom is sufficient
      if (zoom > 0.5) {
        ctx.fillStyle = "#ffffff";
        ctx.font = `${10 * zoom}px sans-serif`;
        ctx.textAlign = "center";
        const label = node.title.length > 20 ? node.title.substring(0, 20) + "..." : node.title;
        ctx.fillText(label, node.x, node.y + nodeSize + 12 * zoom);
      }

      // Highlight selected node
      if (selectedNode && node.id === selectedNode.id) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [graphData, zoom, offset, selectedNode]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = canvas.width / 2 + offset.x;
    const centerY = canvas.height / 2 + offset.y;
    const radius = Math.min(canvas.width, canvas.height) * 0.35 * zoom;

    // Find clicked node
    const nodes = graphData.nodes.map((node, index) => {
      const angle = (index / graphData.nodes.length) * Math.PI * 2;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    for (const node of nodes) {
      const nodeSize = 8 + (node.importance_score / 100) * 12 * zoom;
      const distance = Math.sqrt(
        Math.pow(clickX - node.x, 2) + Math.pow(clickY - node.y, 2)
      );

      if (distance <= nodeSize + 5) {
        setSelectedNode(node);
        return;
      }
    }

    setSelectedNode(null);
  };

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="neon-card rounded-2xl p-8 flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading neural graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="neon-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(0,255,136,0.1)]">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Neural Graph</h3>
          <span className="text-xs text-gray-400 bg-primary/10 px-2 py-1 rounded-full">
            {graphData?.nodes.length || 0} nodes
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors ml-2"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="relative h-[500px]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#0a0a14]/80 backdrop-blur-sm rounded-lg p-3 text-xs">
          <p className="text-gray-400 mb-2">Categories</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
              <span className="text-gray-300">Product</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ccff]" />
              <span className="text-gray-300">Research</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ffcc00]" />
              <span className="text-gray-300">Funding</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ff00ff]" />
              <span className="text-gray-300">News</span>
            </div>
          </div>
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 bg-[#0a0a14]/90 backdrop-blur-sm rounded-lg p-4 max-w-xs border border-primary/20"
          >
            <h4 className="font-semibold text-primary mb-2 line-clamp-2">
              {selectedNode.title}
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="text-secondary">{selectedNode.category || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Score:</span>
                <span className="text-primary">{selectedNode.importance_score.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Source:</span>
                <span className="text-gray-300">{selectedNode.source_name || "N/A"}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-3 text-xs text-gray-400 hover:text-primary transition-colors"
            >
              Click to close
            </button>
          </motion.div>
        )}

        {/* Empty State */}
        {(!graphData || graphData.nodes.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Network className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No events to display</p>
              <p className="text-xs text-gray-500 mt-1">
                Add some events to see the neural graph
              </p>
            </div>
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
      </div>
    </div>
  );
}
