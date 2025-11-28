"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { getClassesByTeacher, Class } from "@/lib/api/classes";

export function Spotlight() {
  const [open, setOpen] = React.useState(false);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (open && user) {
      getClassesByTeacher(user.id).then(setClasses).catch(console.error);
    }
  }, [open, user]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Search"
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[640px] bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden z-[60]"
    >
      <div className="flex items-center border-b border-black/5 dark:border-white/5 px-3">
        <Search className="w-5 h-5 text-slate-400 mr-2" />
        <Command.Input
          placeholder="Search classes or navigate..."
          className="flex-1 h-12 bg-transparent outline-none text-lg text-slate-800 dark:text-white placeholder:text-slate-400"
        />
      </div>

      <Command.List className="max-h-[300px] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm text-slate-500">
          No results found.
        </Command.Empty>

        <Command.Group
          heading="Navigation"
          className="text-xs font-medium text-slate-500 mb-2 px-2"
        >
          <Command.Item
            onSelect={() => runCommand(() => router.push("/dashboard"))}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 aria-selected:bg-blue-500 aria-selected:text-white cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Command.Item>
          <Command.Item
            onSelect={() => runCommand(() => router.push("/schedule"))}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 aria-selected:bg-blue-500 aria-selected:text-white cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            My Schedule
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading="Classes"
          className="text-xs font-medium text-slate-500 mb-2 px-2"
        >
          {classes.map((cls) => (
            <React.Fragment key={cls.id}>
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push(`/class/${cls.id}`))
                }
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 aria-selected:bg-blue-500 aria-selected:text-white cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                {cls.name} (Overview)
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push(`/class/${cls.id}/gradebook`))
                }
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 aria-selected:bg-blue-500 aria-selected:text-white cursor-pointer ml-4 border-l border-slate-200 dark:border-slate-700 pl-2"
              >
                <GraduationCap className="w-4 h-4" />
                Open Gradebook
              </Command.Item>
            </React.Fragment>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
