"use client";

import React from "react";
import { TeacherOSLayout } from "@/components/os/TeacherOSLayout";
import { Window } from "@/components/os/Window";
import { GlassCard } from "@/components/os/GlassCard";

export default function TeacherOSTestPage() {
  return (
    <TeacherOSLayout>
      <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Example Window */}
        <Window title="Welcome to TeacherOS" className="h-96 w-full col-span-2">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Hello, Teacher!</h1>
            <p className="text-muted-foreground">
              This is your new workspace. It's designed to be beautiful, fast,
              and intuitive.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <GlassCard hoverEffect>
                <h3 className="font-semibold">Class G101</h3>
                <p className="text-sm text-muted-foreground">24 Students</p>
              </GlassCard>
              <GlassCard hoverEffect>
                <h3 className="font-semibold">Class G102</h3>
                <p className="text-sm text-muted-foreground">22 Students</p>
              </GlassCard>
            </div>
          </div>
        </Window>

        {/* Example Widget */}
        <GlassCard className="h-64 flex flex-col justify-center items-center text-center space-y-2">
          <div className="text-4xl font-bold">98%</div>
          <div className="text-sm font-medium">Attendance Rate</div>
          <div className="text-xs text-muted-foreground">Today, Nov 25</div>
        </GlassCard>
      </div>
    </TeacherOSLayout>
  );
}
