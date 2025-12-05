"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

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
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-surface-primary dark:bg-black text-text-primary">
      {/* Background Blur Effect */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 dark:opacity-30 blur-3xl" />

      <div className="z-10 flex flex-col items-center space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-surface-elevated/80 dark:bg-white/10 backdrop-blur-md shadow-lg border border-[rgb(var(--border-default))] overflow-hidden">
            <Image
              src="/images/kcislk-logo.png"
              alt="KCISLK Logo"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-wide text-text-primary/90">
            LMS
          </h1>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-64 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary dark:bg-white/20 backdrop-blur-sm">
            <motion.div
              className="h-full bg-accent-blue dark:bg-white shadow-[0_0_10px_rgba(0,122,255,0.3)] dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          <p className="text-center text-xs font-medium text-text-tertiary">
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
