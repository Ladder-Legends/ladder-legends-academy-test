'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, X, Lock } from 'lucide-react';
import type { Video } from '@/types/video';
import type { Coach } from '@/types/coach';
import coachesData from '@/data/coaches.json';
import { useSession } from 'next-auth/react';
import { isOwner } from '@/lib/permissions';

interface CategorySidebarProps {
  videos: Video[];
  selectedRaces: string[];
  selectedGeneral: string[];
  selectedCoaches: string[];
  searchQuery: string;
  onRaceToggle: (race: string) => void;
  onGeneralToggle: (topic: string) => void;
  onCoachToggle: (coach: string) => void;
  onSearchChange: (query: string) => void;
}

export function CategorySidebar({
  videos,
  selectedRaces,
  selectedGeneral,
  selectedCoaches,
  searchQuery,
  onRaceToggle,
  onGeneralToggle,
  onCoachToggle,
  onSearchChange,
}: CategorySidebarProps) {
  const { data: session } = useSession();
  const userIsOwner = isOwner(session);

  const [raceExpanded, setRaceExpanded] = useState(true);
  const [generalExpanded, setGeneralExpanded] = useState(true);
  const [coachExpanded, setCoachExpanded] = useState(true);
  const [inactiveCoachExpanded, setInactiveCoachExpanded] = useState(false);

  // Race categories
  const races = ['terran', 'zerg', 'protoss'];

  // General/topic categories (videos without race tags)
  const generalTopics = ['mindset', 'fundamentals', 'meta', 'build order', 'micro', 'macro'];

  // Coach categories - dynamically loaded from coaches.json
  const allCoaches = coachesData as Coach[];
  const activeCoaches = allCoaches.filter(coach => coach.isActive !== false);
  const inactiveCoaches = allCoaches.filter(coach => coach.isActive === false);

  // Use coach IDs for filtering (not names)
  const coaches = activeCoaches.map(coach => coach.id);
  const inactiveCoachIds = inactiveCoaches.map(coach => coach.id);

  // Count videos for each category
  const getCount = (tag: string, currentFilters: { races: string[], general: string[], coaches: string[] }) => {
    return videos.filter(video => {
      const videoTags = video.tags.map(t => t.toLowerCase());

      // Special handling for coach IDs - check coachId field instead of tags
      const isCoachId = coaches.includes(tag) || inactiveCoachIds.includes(tag);
      if (isCoachId) {
        if (video.coachId !== tag) return false;
      } else {
        // For non-coach filters, check if video matches the tag
        if (!videoTags.includes(tag.toLowerCase())) return false;
      }

      // Apply current filters
      const { races: filterRaces, general: filterGeneral, coaches: filterCoaches } = currentFilters;

      // If any race filter is active, video must have at least one
      if (filterRaces.length > 0 && !filterRaces.some(r => videoTags.includes(r))) {
        return false;
      }

      // If any general filter is active, video must have at least one
      if (filterGeneral.length > 0 && !filterGeneral.some(g => videoTags.includes(g))) {
        return false;
      }

      // If any coach filter is active, video must match by coachId
      if (filterCoaches.length > 0 && !filterCoaches.some(c => video.coachId === c)) {
        return false;
      }

      return true;
    }).length;
  };

  const currentFilters = {
    races: selectedRaces,
    general: selectedGeneral,
    coaches: selectedCoaches,
  };

  return (
    <aside className="w-64 border-r border-border bg-card/30 p-4 space-y-6 overflow-y-auto">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search videos..."
          className="w-full pl-10 pr-10 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Race-Specific Section */}
      <div>
        <button
          onClick={() => setRaceExpanded(!raceExpanded)}
          className="flex items-center justify-between w-full mb-3 font-semibold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            🎮 Race-Specific
          </span>
          {raceExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {raceExpanded && (
          <div className="space-y-1">
            {races.map(race => {
              const count = getCount(race, currentFilters);
              const isSelected = selectedRaces.includes(race);
              return (
                <button
                  key={race}
                  onClick={() => onRaceToggle(race)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="capitalize">{race}</span>
                    <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* General Section */}
      <div>
        <button
          onClick={() => setGeneralExpanded(!generalExpanded)}
          className="flex items-center justify-between w-full mb-3 font-semibold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            📚 General
          </span>
          {generalExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {generalExpanded && (
          <div className="space-y-1">
            {generalTopics.map(topic => {
              const count = getCount(topic, currentFilters);
              const isSelected = selectedGeneral.includes(topic);
              if (count === 0) return null; // Hide if no videos
              return (
                <button
                  key={topic}
                  onClick={() => onGeneralToggle(topic)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="capitalize">{topic}</span>
                    <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Coaches Section */}
      <div>
        <button
          onClick={() => setCoachExpanded(!coachExpanded)}
          className="flex items-center justify-between w-full mb-3 font-semibold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            👨‍🏫 Coaches
          </span>
          {coachExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {coachExpanded && (
          <div className="space-y-1">
            {coaches.map(coachId => {
              const coach = activeCoaches.find(c => c.id === coachId);
              if (!coach) return null;
              const count = getCount(coachId, currentFilters);
              const isSelected = selectedCoaches.includes(coachId);
              if (count === 0) return null; // Hide if no videos
              return (
                <button
                  key={coachId}
                  onClick={() => onCoachToggle(coachId)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="capitalize">{coach.displayName}</span>
                    <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Inactive Coaches Section (Owners Only) */}
      {userIsOwner && inactiveCoachIds.length > 0 && (
        <div>
          <button
            onClick={() => setInactiveCoachExpanded(!inactiveCoachExpanded)}
            className="flex items-center justify-between w-full mb-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors group"
          >
            <span className="flex items-center gap-2">
              <span className="relative group/lock">
                <Lock size={14} className="inline" />
                {/* Tooltip */}
                <span className="absolute left-0 bottom-full mb-2 hidden group-hover/lock:block w-48 px-2 py-1 text-xs font-normal normal-case bg-popover text-popover-foreground border border-border rounded shadow-lg z-50 whitespace-normal">
                  Visible only to site owners
                </span>
              </span>
              <span>Inactive Coaches</span>
            </span>
            {inactiveCoachExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {inactiveCoachExpanded && (
            <div className="space-y-1 opacity-60">
              {inactiveCoachIds.map(coachId => {
                const coach = inactiveCoaches.find(c => c.id === coachId);
                if (!coach) return null;
                const count = getCount(coachId, currentFilters);
                const isSelected = selectedCoaches.includes(coachId);
                if (count === 0) return null; // Hide if no videos
                return (
                  <button
                    key={coachId}
                    onClick={() => onCoachToggle(coachId)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="capitalize">{coach.displayName}</span>
                      <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
