'use client';

import { useState, useMemo } from 'react';
import { CategorySidebar, Category } from '@/components/category-sidebar';
import replaysData from '@/data/replays.json';
import { Replay } from '@/types/replay';
import Link from 'next/link';
import { Download, Video, X } from 'lucide-react';

const allReplays = replaysData as Replay[];

export function ReplaysContent() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Extract all unique tags from replays
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allReplays.forEach(replay => {
      replay.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // Create categories based on matchup
  const categories: Category[] = useMemo(() => {
    const getMatchupCount = (matchup: string) =>
      allReplays.filter(r => r.matchup === matchup).length;

    return [
      {
        id: 'terran',
        label: 'Terran Replays',
        children: [
          { id: 'TvT', label: 'Terran vs Terran', count: getMatchupCount('TvT') },
          { id: 'TvZ', label: 'Terran vs Zerg', count: getMatchupCount('TvZ') },
          { id: 'TvP', label: 'Terran vs Protoss', count: getMatchupCount('TvP') },
        ]
      },
      {
        id: 'zerg',
        label: 'Zerg Replays',
        children: [
          { id: 'ZvT', label: 'Zerg vs Terran', count: getMatchupCount('ZvT') },
          { id: 'ZvZ', label: 'Zerg vs Zerg', count: getMatchupCount('ZvZ') },
          { id: 'ZvP', label: 'Zerg vs Protoss', count: getMatchupCount('ZvP') },
        ]
      },
      {
        id: 'protoss',
        label: 'Protoss Replays',
        children: [
          { id: 'PvT', label: 'Protoss vs Terran', count: getMatchupCount('PvT') },
          { id: 'PvZ', label: 'Protoss vs Zerg', count: getMatchupCount('PvZ') },
          { id: 'PvP', label: 'Protoss vs Protoss', count: getMatchupCount('PvP') },
        ]
      }
    ];
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Filter replays based on selected category and tags
  const filteredReplays = useMemo(() => {
    let filtered = allReplays;

    // Apply category filter
    if (selectedCategory) {
      // Check if it's a matchup category (e.g., "TvT", "ZvP", etc.)
      if (['TvT', 'TvZ', 'TvP', 'ZvT', 'ZvZ', 'ZvP', 'PvT', 'PvZ', 'PvP'].includes(selectedCategory)) {
        filtered = filtered.filter(r => r.matchup === selectedCategory);
      } else {
        // Otherwise filter by race
        filtered = filtered.filter(r => {
          const matchup = r.matchup.toLowerCase();
          return matchup.startsWith(selectedCategory.charAt(0));
        });
      }
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(replay =>
        selectedTags.every(tag => replay.tags.includes(tag))
      );
    }

    return filtered;
  }, [selectedCategory, selectedTags]);

  const getRaceColor = (race: string) => {
    switch (race.toLowerCase()) {
      case 'terran': return 'text-orange-500';
      case 'zerg': return 'text-purple-500';
      case 'protoss': return 'text-cyan-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex gap-8">
      <CategorySidebar
        title="Replays"
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <div className="flex-1">
        <div className="mb-4 space-y-4">
          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Filter by Tags</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="inline-block ml-1 h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredReplays.length} replay{filteredReplays.length !== 1 ? 's' : ''}
            </p>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold">Title</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Players</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Matchup</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Map</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Duration</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReplays.map((replay, index) => (
                <tr
                  key={replay.id}
                  className={`border-t border-border hover:bg-muted/30 transition-colors ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                  }`}
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/replays/${replay.id}`}
                      className="text-base font-medium hover:text-primary transition-colors"
                    >
                      {replay.title}
                    </Link>
                    {replay.coach && (
                      <p className="text-sm text-muted-foreground mt-1.5">
                        Coach: {replay.coach}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 ${replay.player1.result === 'win' ? 'font-semibold' : ''}`}>
                        <span className={getRaceColor(replay.player1.race)}>
                          {replay.player1.race.charAt(0).toUpperCase()}
                        </span>
                        <span>{replay.player1.name}</span>
                        {replay.player1.mmr && (
                          <span className="text-xs text-muted-foreground">({replay.player1.mmr})</span>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 ${replay.player2.result === 'win' ? 'font-semibold' : ''}`}>
                        <span className={getRaceColor(replay.player2.race)}>
                          {replay.player2.race.charAt(0).toUpperCase()}
                        </span>
                        <span>{replay.player2.name}</span>
                        {replay.player2.mmr && (
                          <span className="text-xs text-muted-foreground">({replay.player2.mmr})</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{replay.matchup}</td>
                  <td className="px-6 py-4 text-sm">{replay.map}</td>
                  <td className="px-6 py-4 text-sm">{replay.duration}</td>
                  <td className="px-6 py-4 text-sm">{new Date(replay.gameDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/replays/${replay.id}`}
                        className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                      >
                        View
                      </Link>
                      {replay.downloadUrl && (
                        <a
                          href={replay.downloadUrl}
                          download
                          className="text-sm px-4 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      )}
                      {replay.coachingVideoId && (
                        <Link
                          href={`/?videoId=${replay.coachingVideoId}`}
                          className="text-sm px-4 py-2 bg-accent hover:bg-accent/80 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                        >
                          <Video className="h-3.5 w-3.5" />
                          VOD
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReplays.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No replays found for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
