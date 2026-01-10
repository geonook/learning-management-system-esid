"use client";

import { RotateCcw } from "lucide-react";

interface OrientationGuardProps {
  children: React.ReactNode;
}

/**
 * OrientationGuard Component
 *
 * Displays a rotation prompt on tablets when in portrait mode.
 * The LMS is optimized for landscape orientation on tablets.
 *
 * Behavior:
 * - Desktop (lg+): Always shows content
 * - Tablet portrait (md, portrait): Shows rotation prompt
 * - Tablet landscape (md, landscape): Shows content
 * - Mobile (<md): Always shows content (mobile layout)
 */
export function OrientationGuard({ children }: OrientationGuardProps) {
  return (
    <>
      {/* Portrait mode prompt - Only shown on tablets (md) in portrait orientation */}
      <div className="hidden portrait:flex md:portrait:flex lg:hidden fixed inset-0 z-50 bg-surface-primary items-center justify-center flex-col gap-4 p-8">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="p-4 bg-surface-secondary rounded-full">
            <RotateCcw className="w-16 h-16 text-text-tertiary animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-text-primary">
              Rotate Your Device
            </h2>
            <p className="text-text-secondary">
              For the best experience, please rotate your tablet to landscape mode.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <div className="w-8 h-12 border-2 border-text-tertiary rounded-md" />
            <span className="text-lg">→</span>
            <div className="w-12 h-8 border-2 border-text-tertiary rounded-md" />
          </div>
        </div>
      </div>

      {/*
        Content visibility:
        - Mobile (<md): Always visible
        - Tablet portrait (md, portrait): Hidden (showing rotation prompt instead)
        - Tablet landscape (md, landscape): Visible
        - Desktop (lg+): Always visible
      */}
      <div className="block md:portrait:hidden md:landscape:block lg:block">
        {children}
      </div>
    </>
  );
}
