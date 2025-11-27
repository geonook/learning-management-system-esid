"use client";

import { motion } from "framer-motion";

export function Desktop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 dark:bg-[#1e1e1e] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Animated Background Gradients - Fixed to viewport */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-purple-400/20 blur-[100px]"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-400/20 blur-[100px]"
          animate={{
            x: [0, -50, 0],
            y: [0, 100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-[20%] left-[20%] w-[80%] h-[60%] rounded-full bg-indigo-400/20 blur-[100px]"
          animate={{
            x: [0, 50, 0],
            y: [0, -50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
