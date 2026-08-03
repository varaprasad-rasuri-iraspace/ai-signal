"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Clock } from "lucide-react";

interface RefreshButtonProps {
  onRefresh?: () => void;
  showLastUpdated?: boolean;
}

export default function RefreshButton({ onRefresh, showLastUpdated = true }: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load last updated time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lastIngestionTime");
    if (stored) {
      setLastUpdated(new Date(stored));
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleRefresh = async () => {
    if (isLoading || cooldownSeconds > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/jobs/trigger`,
        { method: "POST" }
      );
      const result = await response.json();

      // Update last updated time
      const now = new Date();
      setLastUpdated(now);
      localStorage.setItem("lastIngestionTime", now.toISOString());

      // Set cooldown
      setCooldownSeconds(60);

      // Show success message
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-primary/20 border border-primary/40 text-primary px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300";
      toast.style.opacity = "0";
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>${result.message || "Ingestion triggered successfully!"}</span>
        </div>
      `;
      document.body.appendChild(toast);

      setTimeout(() => (toast.style.opacity = "1"), 10);
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
      }, 3000);

      onRefresh?.();
    } catch (error) {
      console.error("Failed to trigger ingestion:", error);
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-red-500/20 border border-red-500/40 text-red-400 px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300";
      toast.style.opacity = "0";
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <span>Failed to trigger ingestion</span>
        </div>
      `;
      document.body.appendChild(toast);

      setTimeout(() => (toast.style.opacity = "1"), 10);
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || cooldownSeconds > 0;
  const formattedLastUpdated = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Never";

  return (
    <div className="flex items-center gap-2">
      {/* Refresh Button */}
      <motion.button
        onClick={handleRefresh}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.1 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
        className={`p-2 rounded-lg transition-all ${
          isDisabled
            ? "text-gray-600 cursor-not-allowed bg-gray-900/30"
            : "text-gray-400 hover:text-primary hover:bg-primary/10"
        }`}
        title={
          cooldownSeconds > 0
            ? `Cooldown: ${cooldownSeconds}s`
            : "Refresh data from sources"
        }
      >
        <motion.div
          animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
          transition={isLoading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        >
          <Zap className="w-5 h-5" />
        </motion.div>
      </motion.button>

      {/* Cooldown Timer */}
      {cooldownSeconds > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-1 px-2 py-1 bg-secondary/10 border border-secondary/30 rounded-lg text-xs text-secondary"
        >
          <Clock className="w-3 h-3" />
          <span>{cooldownSeconds}s</span>
        </motion.div>
      )}

      {/* Last Updated */}
      {showLastUpdated && !isLoading && cooldownSeconds === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-500 hidden sm:block"
        >
          Last: {formattedLastUpdated}
        </motion.div>
      )}
    </div>
  );
}
