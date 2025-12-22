"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Star,
  Hand,
  Heart,
  MessageCircle,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { getBehaviorTags, type BehaviorTag } from "@/lib/api/attendance";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface BehaviorTagPickerProps {
  onSelect: (tag: BehaviorTag) => void;
  disabled?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="w-4 h-4" />,
  hand: <Hand className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  "message-circle": <MessageCircle className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  "alert-triangle": <AlertTriangle className="w-4 h-4" />,
};

export function BehaviorTagPicker({
  onSelect,
  disabled = false,
}: BehaviorTagPickerProps) {
  const [tags, setTags] = useState<BehaviorTag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getBehaviorTags().then(setTags);
  }, []);

  const positiveTags = tags.filter((t) => t.type === "positive");
  const negativeTags = tags.filter((t) => t.type === "negative");

  const handleSelect = (tag: BehaviorTag) => {
    onSelect(tag);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-3">
          {/* Positive Tags */}
          <div>
            <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1.5">
              Positive
            </div>
            <div className="space-y-1">
              {positiveTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleSelect(tag)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-left transition-colors"
                >
                  <span className="text-green-600 dark:text-green-400">
                    {iconMap[tag.icon || "star"] || <Star className="w-4 h-4" />}
                  </span>
                  <span className="text-sm">{tag.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Negative Tags */}
          <div>
            <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1.5">
              Needs Improvement
            </div>
            <div className="space-y-1">
              {negativeTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleSelect(tag)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors"
                >
                  <span className="text-red-600 dark:text-red-400">
                    {iconMap[tag.icon || "alert-triangle"] || (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </span>
                  <span className="text-sm">{tag.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BehaviorTagBadge({
  tag,
  onRemove,
}: {
  tag: BehaviorTag;
  onRemove?: () => void;
}) {
  const isPositive = tag.type === "positive";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
        isPositive
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}
    >
      {iconMap[tag.icon || (isPositive ? "star" : "alert-triangle")]}
      <span>{tag.name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
    </span>
  );
}
