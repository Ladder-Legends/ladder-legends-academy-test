'use client';

import { useState, useMemo, useCallback } from 'react';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import replaysData from '@/data/replays.json';
import { Replay } from '@/types/replay';
import Link from 'next/link';
import { Download, Video, X, Plus, Edit, Trash2 } from 'lucide-react';
import { PaywallLink } from '@/components/auth/paywall-link';
import { ReplayEditModal } from '@/components/admin/replay-edit-modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { toast } from 'sonner';

const allReplays = replaysData as Replay[];

export function ReplaysContent() {
  const { addChange } = usePendingChanges();
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    terran: [],
    zerg: [],
    protoss: [],
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for editing
  const [editingReplay, setEditingReplay] = useState<Replay | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewReplay, setIsNewReplay] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Handle filter toggle
  const handleItemToggle = (sectionId: string, itemId: string) => {
    setSelectedItems(prev => {
      const current = prev[sectionId] || [];
      const updated = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [sectionId]: updated };
    });
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Admin handlers
  const handleEdit = (replay: Replay) => {
    setEditingReplay(replay);
    setIsNewReplay(false);
    setIsModalOpen(true);
  };

  const handleDelete = (replay: Replay) => {
    if (confirm(`Are you sure you want to delete "${replay.title}"?`)) {
      addChange({
        id: replay.id,
        contentType: 'replays',
        operation: 'delete',
        data: replay as unknown as Record<string, unknown>,
      });
      toast.success(`Replay deleted (pending commit)`);
    }
  };

  const handleAddNew = () => {
    setEditingReplay(null);
    setIsNewReplay(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReplay(null);
    setIsNewReplay(false);
  };

  // Extract all unique tags from replays
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allReplays.forEach(replay => {
      replay.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // Count replays for each filter with context-aware filtering
  const getCount = useCallback((filterFn: (replay: Replay) => boolean, excludeSectionId?: string) => {
    return allReplays.filter(replay => {
      if (!filterFn(replay)) return false;

      // Apply tag filter
      if (selectedTags.length > 0 && !selectedTags.every(tag => replay.tags.includes(tag))) {
        return false;
      }

      // Apply other race/matchup filters (excluding the current section being counted)
      const allSelectedMatchups = [
        ...(excludeSectionId === 'terran' ? [] : (selectedItems.terran || [])),
        ...(excludeSectionId === 'zerg' ? [] : (selectedItems.zerg || [])),
        ...(excludeSectionId === 'protoss' ? [] : (selectedItems.protoss || [])),
      ];

      if (allSelectedMatchups.length > 0) {
        const matchesFilter = allSelectedMatchups.some(filterId => {
          if (['TvT', 'TvZ', 'TvP', 'ZvT', 'ZvZ', 'ZvP', 'PvT', 'PvZ', 'PvP'].includes(filterId)) {
            return replay.matchup === filterId;
          }
          return false;
        });
        if (!matchesFilter) return false;
      }

      return true;
    }).length;
  }, [selectedTags, selectedItems]);

  // Build filter sections with race as top-level sections
  const filterSections = useMemo((): FilterSection[] => {
    return [
      {
        id: 'terran',
        label: 'Terran',
        items: [
          { id: 'TvT', label: 'vs Terran', count: getCount(r => r.matchup === 'TvT', 'terran') },
          { id: 'TvZ', label: 'vs Zerg', count: getCount(r => r.matchup === 'TvZ', 'terran') },
          { id: 'TvP', label: 'vs Protoss', count: getCount(r => r.matchup === 'TvP', 'terran') },
        ],
      },
      {
        id: 'zerg',
        label: 'Zerg',
        items: [
          { id: 'ZvT', label: 'vs Terran', count: getCount(r => r.matchup === 'ZvT', 'zerg') },
          { id: 'ZvZ', label: 'vs Zerg', count: getCount(r => r.matchup === 'ZvZ', 'zerg') },
          { id: 'ZvP', label: 'vs Protoss', count: getCount(r => r.matchup === 'ZvP', 'zerg') },
        ],
      },
      {
        id: 'protoss',
        label: 'Protoss',
        items: [
          { id: 'PvT', label: 'vs Terran', count: getCount(r => r.matchup === 'PvT', 'protoss') },
          { id: 'PvZ', label: 'vs Zerg', count: getCount(r => r.matchup === 'PvZ', 'protoss') },
          { id: 'PvP', label: 'vs Protoss', count: getCount(r => r.matchup === 'PvP', 'protoss') },
        ],
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTags, selectedItems, getCount]);

  // Filter replays based on search, selected filters, and tags
  const filteredReplays = useMemo(() => {
    return allReplays.filter(replay => {
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          replay.title.toLowerCase().includes(query) ||
          replay.map.toLowerCase().includes(query) ||
          replay.player1.name.toLowerCase().includes(query) ||
          replay.player2.name.toLowerCase().includes(query) ||
          (replay.coach && replay.coach.toLowerCase().includes(query)) ||
          replay.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Apply matchup filters with OR logic (selecting multiple matchups shows ANY match)
      const allSelectedMatchups = [
        ...(selectedItems.terran || []),
        ...(selectedItems.zerg || []),
        ...(selectedItems.protoss || []),
      ];

      if (allSelectedMatchups.length > 0) {
        const matchesAnyMatchup = allSelectedMatchups.some(filterId => {
          if (['TvT', 'TvZ', 'TvP', 'ZvT', 'ZvZ', 'ZvP', 'PvT', 'PvZ', 'PvP'].includes(filterId)) {
            return replay.matchup === filterId;
          }
          return false;
        });
        if (!matchesAnyMatchup) return false;
      }

      // Apply tag filters with AND logic (must have ALL selected tags)
      if (selectedTags.length > 0 && !selectedTags.every(tag => replay.tags.includes(tag))) {
        return false;
      }

      return true;
    });
  }, [selectedItems, selectedTags, searchQuery]);

  return (
    <div className="flex flex-1">
      <FilterSidebar
        searchEnabled={true}
        searchPlaceholder="Search replays..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sections={filterSections}
        selectedItems={selectedItems}
        onItemToggle={handleItemToggle}
      />

      <main className="flex-1 px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Replays</h2>
              <p className="text-muted-foreground">
                Download and study replays from our coaches and top-level games. Filter by race, matchup, and MMR bracket.
              </p>
            </div>
            <PermissionGate require="coaches">
              <Button onClick={handleAddNew} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Replay
              </Button>
            </PermissionGate>
          </div>

          <div className="space-y-4">
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
                  onMouseEnter={() => setHoveredRow(replay.id)}
                  onMouseLeave={() => setHoveredRow(null)}
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
                        <span>
                          {replay.player1.race.charAt(0).toUpperCase()}
                        </span>
                        <span>{replay.player1.name}</span>
                        {replay.player1.mmr && (
                          <span className="text-xs text-muted-foreground">({replay.player1.mmr})</span>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 ${replay.player2.result === 'win' ? 'font-semibold' : ''}`}>
                        <span>
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
                        <PaywallLink
                          href={replay.downloadUrl}
                          external
                          className="text-sm px-4 py-2 border-2 border-primary text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </PaywallLink>
                      )}
                      {replay.coachingVideoId && (
                        <PaywallLink
                          href={`/?videoId=${replay.coachingVideoId}`}
                          className="text-sm px-4 py-2 border-2 border-primary text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                        >
                          <Video className="h-3.5 w-3.5" />
                          VOD
                        </PaywallLink>
                      )}
                      <PermissionGate require="coaches">
                        {hoveredRow === replay.id && (
                          <>
                            <button
                              onClick={() => handleEdit(replay)}
                              className="text-sm px-3 py-2 border border-border hover:bg-muted rounded-md transition-colors flex items-center gap-1.5"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(replay)}
                              className="text-sm px-3 py-2 border border-destructive text-destructive hover:bg-destructive/10 rounded-md transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </PermissionGate>
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
      </main>

      <ReplayEditModal
        replay={editingReplay}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewReplay}
      />
    </div>
  );
}
