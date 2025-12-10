"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { GraduationCap, Mail, Settings } from "lucide-react";
import { MacAppIcon } from "./MacAppIcon";
import { CalendarIconContent } from "./CalendarIconContent";
import { useRouter } from "next/navigation";

interface DockProps {
  onAppClick?: (appId: string) => void;
}

const RemindersIcon = () => (
  <div className="w-full h-full rounded-[16px] bg-surface-tertiary dark:bg-[#1C1C1E] relative flex flex-col justify-center px-[18%] gap-[12%] shadow-md border border-[rgb(var(--border-default))]">
    {/* Row 1: Blue */}
    <div className="flex items-center gap-2">
      <div className="w-[18%] aspect-square rounded-full bg-[#0A84FF] shadow-sm" />
      <div className="h-[4px] w-full bg-surface-secondary dark:bg-[#3A3A3C] rounded-full" />
    </div>
    {/* Row 2: Red */}
    <div className="flex items-center gap-2">
      <div className="w-[18%] aspect-square rounded-full bg-[#FF453A] shadow-sm" />
      <div className="h-[4px] w-full bg-surface-secondary dark:bg-[#3A3A3C] rounded-full" />
    </div>
    {/* Row 3: Orange */}
    <div className="flex items-center gap-2">
      <div className="w-[18%] aspect-square rounded-full bg-[#FF9F0A] shadow-sm" />
      <div className="h-[4px] w-full bg-surface-secondary dark:bg-[#3A3A3C] rounded-full" />
    </div>
  </div>
);

const LinksDockIcon = () => (
  <div className="w-full h-full rounded-[16px] bg-surface-tertiary dark:bg-[#1c1c1e] relative flex flex-col items-center p-[10%] shadow-md border border-[rgb(var(--border-default))]">
    {/* Search Bar */}
    <div className="w-full h-[20%] bg-text-secondary/20 rounded-full mb-[10%] flex items-center px-[10%]">
      <div className="w-[15%] h-[15%] rounded-full border-[1.5px] border-text-secondary/50" />
    </div>
    {/* App Grid */}
    <div className="w-full flex-1 grid grid-cols-3 gap-[10%]">
      <div className="rounded-[4px] bg-orange-500" />
      <div className="rounded-[4px] bg-pink-500" />
      <div className="rounded-[4px] bg-emerald-500" />
      <div className="rounded-[4px] bg-purple-500" />
      <div className="rounded-[4px] bg-blue-500" />
      <div className="rounded-[4px] bg-gray-500" />
    </div>
  </div>
);

export function Dock({ onAppClick }: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const router = useRouter();

  const handleAppClick = (appId: string) => {
    if (onAppClick) {
      onAppClick(appId);
      return;
    }

    // Default routing logic for LMS
    switch (appId) {
      case "documents": // Finder
        router.push("/finder");
        break;
      case "lms":
        router.push("/dashboard");
        break;
      case "portal":
        window.open("https://info-hub.zeabur.app", "_blank");
        break;
      case "settings":
        router.push("/admin/settings");
        break;
      default:
        console.log("App clicked:", appId);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex h-[72px] items-end gap-3 rounded-2xl bg-surface-elevated/60 dark:bg-white/20 px-3 pb-3 backdrop-blur-2xl border border-[rgb(var(--border-default))] shadow-xl"
      >
        {/* Finder */}
        <DockIcon mouseX={mouseX} onClick={() => handleAppClick("documents")}>
          <MacAppIcon name="Finder">
            <div className="w-full h-full rounded-[16px] bg-gradient-to-b from-[#00D8FF] to-[#0082FF] relative overflow-hidden shadow-md border border-white/10">
              {/* Face Line */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full p-[15%] drop-shadow-sm opacity-90"
              >
                <path
                  d="M15,35 Q50,65 85,35 M15,35 L15,75 Q50,95 85,75 L85,35"
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M50,10 L50,90"
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </MacAppIcon>
        </DockIcon>

        {/* Reminders (Was Launchpad) */}
        <DockIcon mouseX={mouseX} onClick={() => handleAppClick("tasks")}>
          <MacAppIcon name="Reminders">
            <RemindersIcon />
          </MacAppIcon>
        </DockIcon>

        {/* Links Dock (Was Info Hub) */}
        <DockIcon mouseX={mouseX} onClick={() => handleAppClick("portal")}>
          <MacAppIcon name="Links Dock">
            <LinksDockIcon />
          </MacAppIcon>
        </DockIcon>

        {/* Mail */}
        <DockIcon mouseX={mouseX} onClick={() => handleAppClick("messages")}>
          <MacAppIcon
            name="Mail"
            icon={<Mail className="drop-shadow-md" />}
            gradient="bg-gradient-to-b from-[#5AB2FF] to-[#007AFF]"
          />
        </DockIcon>

        {/* Calendar */}
        <DockIcon mouseX={mouseX} onClick={() => handleAppClick("calendar")}>
          <MacAppIcon name="Calendar">
            <CalendarIconContent />
          </MacAppIcon>
        </DockIcon>

        {/* LMS */}
        <DockIcon mouseX={mouseX} onClick={() => handleAppClick("lms")}>
          <MacAppIcon
            name="LMS"
            icon={<GraduationCap className="drop-shadow-md" />}
            gradient="bg-gradient-to-b from-[#FF9F0A] to-[#FF6900]" // Changed to Orange for variety
          />
        </DockIcon>

        {/* Settings */}
        <DockIcon mouseX={mouseX} onClick={() => handleAppClick("settings")}>
          <MacAppIcon
            name="Settings"
            icon={<Settings className="drop-shadow-md animate-spin-slow" />}
            gradient="bg-gradient-to-b from-[#8E8E93] to-[#636366]"
          />
        </DockIcon>
      </motion.div>
    </div>
  );
}

function DockIcon({
  mouseX,
  children,
  onClick,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mouseX: any; // MotionValue<number> but using any to avoid complex type imports for now
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [48, 80, 48]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="aspect-square flex items-center justify-center"
    >
      <div className="w-full h-full cursor-pointer" onClick={onClick}>
        {children}
      </div>
    </motion.div>
  );
}
