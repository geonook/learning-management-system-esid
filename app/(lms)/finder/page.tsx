"use client";

import { Finder } from "@/components/finder/Finder";
import { useAppStore } from "@/lib/store";
import { Window } from "@/components/os/Window";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function FinderPage() {
  const role = useAppStore((s) => s.role);

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
    <div className="h-full w-full p-4 flex items-center justify-center">
      <Window
        title="Class Manager"
        className="w-[90%] h-[85%] max-w-6xl"
        onClose={() => console.log("Close Finder")}
        onMinimize={() => console.log("Minimize Finder")}
        onMaximize={() => console.log("Maximize Finder")}
      >
        <Finder role={role || "office"} />
      </Window>
    </div>
    </AuthGuard>
  );
}
