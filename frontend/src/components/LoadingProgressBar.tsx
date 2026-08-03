"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface LoadingProgressBarProps {
  isLoading: boolean;
  progress?: number; // 0-100
}

export default function LoadingProgressBar({ isLoading, progress = 0 }: LoadingProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      // Animate progress from current to target
      const interval = setInterval(() => {
        setDisplayProgress((prev) => {
          // Gradually increase but never reach 100 while loading
          const target = Math.min(progress || 85, 85);
          if (prev < target) {
            return Math.min(prev + Math.random() * 15, target);
          }
          return prev;
        });
      }, 300);

      return () => clearInterval(interval);
    } else {
      // Complete the progress bar
      setDisplayProgress(100);
      // Reset after animation completes
      const timeout = setTimeout(() => setDisplayProgress(0), 600);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, progress]);

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ 
        opacity: isLoading || displayProgress > 0 ? 1 : 0,
        scaleX: 1
      }}
      transition={{ duration: 0.3 }}
      className="fixed top-16 left-0 right-0 h-1 z-40 origin-left"
    >
      <motion.div
        animate={{ width: `${displayProgress}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="h-full bg-gradient-to-r from-primary via-secondary to-accent shadow-lg"
        style={{
          boxShadow: "0 0 20px rgba(0, 255, 136, 0.6)",
        }}
      />
    </motion.div>
  );
}
