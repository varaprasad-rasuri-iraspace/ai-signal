"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface LoadingSpinnerProps {
  isLoading: boolean;
}

export default function LoadingSpinner({ isLoading }: LoadingSpinnerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
    } else {
      // Keep visible briefly after loading completes for smooth transition
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a14]/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Large Spinning Circle */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full"
        />
        
        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl font-semibold text-primary">Loading...</span>
          <span className="text-sm text-gray-400">Fetching AI signals</span>
        </div>
        
        {/* Animated dots */}
        <div className="flex gap-2">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 bg-primary rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 bg-primary rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 bg-primary rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
