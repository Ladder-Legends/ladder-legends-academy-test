'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import type { Video } from '@/types/video';

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
  const [raceExpanded, setRaceExpanded] = useState(true);
  const [generalExpanded, setGeneralExpanded] = useState(true);
  const [coachExpanded, setCoachExpanded] = useState(true);

  // Race categories
  const races = ['terran', 'zerg', 'protoss'];

  // General/topic categories (videos without race tags)
  const generalTopics = ['mindset', 'fundamentals', 'meta', 'build order', 'micro', 'macro'];

  // Coach categories
  const coaches = ['groovy', 'hino', 'coach nico', 'gamerrichy', 'battleb', 'krystianer', 'drakka'];

  // Count videos for each category
  const getCount = (tag: string, currentFilters: { races: string[], general: string[], coaches: string[] }) => {
    return videos.filter(video => {
      const videoTags = video.tags.map(t => t.toLowerCase());

      // Check if video matches the tag we're counting
      if (!videoTags.includes(tag.toLowerCase())) return false;

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

      // If any coach filter is active, video must have at least one
      if (filterCoaches.length > 0 && !filterCoaches.some(c => videoTags.includes(c))) {
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

      {/* Coaches Section */}
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
            {coaches.map(coach => {
              const count = getCount(coach, currentFilters);
              const isSelected = selectedCoaches.includes(coach);
              if (count === 0) return null; // Hide if no videos
              return (
                <button
                  key={coach}
                  onClick={() => onCoachToggle(coach)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="capitalize">{coach}</span>
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
    </aside>
  );
}
