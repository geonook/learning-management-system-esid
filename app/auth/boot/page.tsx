"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Apple } from "lucide-react";

export default function BootPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate boot progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Random increment for realistic feel
        return prev + Math.random() * 10;
      });
    }, 150);

    // Redirect after completion
    const timeout = setTimeout(() => {
      router.push("/dashboard");
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* Background Blur Effect */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 blur-3xl" />

      <div className="z-10 flex flex-col items-center space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/20">
            <Apple className="h-12 w-12 text-white fill-current" />
          </div>
          <h1 className="text-2xl font-semibold tracking-wide text-white/90">
            LMS
          </h1>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-64 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
            <motion.div
              className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          <p className="text-center text-xs font-medium text-white/50">
            {progress < 30
              ? "Initializing..."
              : progress < 70
              ? "Loading Workspace..."
              : "Opening LMS..."}
          </p>
        </div>
      </div>
    </div>
  );
}
