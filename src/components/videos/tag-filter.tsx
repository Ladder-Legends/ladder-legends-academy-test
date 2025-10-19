'use client';

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearAll: () => void;
}

export function TagFilter({ availableTags, selectedTags, onTagToggle, onClearAll }: TagFilterProps) {
  const getTagColor = (tag: string): string => {
    const tagLower = tag.toLowerCase();
    if (tagLower === 'protoss') return 'bg-[hsl(var(--chart-1))] hover:bg-[hsl(var(--chart-1))]/80';
    if (tagLower === 'terran') return 'bg-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))]/80';
    if (tagLower === 'zerg') return 'bg-[hsl(var(--chart-3))] hover:bg-[hsl(var(--chart-3))]/80';
    if (tagLower === 'macro') return 'bg-[hsl(var(--chart-4))] hover:bg-[hsl(var(--chart-4))]/80';
    if (tagLower === 'micro') return 'bg-[hsl(var(--chart-5))] hover:bg-[hsl(var(--chart-5))]/80';
    return 'bg-primary hover:bg-primary/80';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filter by Tags</h3>
        {selectedTags.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? `${getTagColor(tag)} text-white border-0`
                  : 'hover:border-primary'
              }`}
              onClick={() => onTagToggle(tag)}
            >
              {tag}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
