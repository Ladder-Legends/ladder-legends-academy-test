'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import { FilterSidebar } from '@/components/shared/filter-sidebar';
import { MyReplaysTable } from './my-replays-table';
import { MyReplaysOverview } from './my-replays-overview';
import { PlayerNameSuggestionCard } from './player-name-suggestion-card';
import { UserReplayData, UserSettings } from '@/lib/replay-types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function MyReplaysContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [replays, setReplays] = useState<UserReplayData[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState(''); // error display UI not yet implemented

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string[]>>({
    matchup: [],
    result: [],
    build: [],
    gameType: [],
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [replayToDelete, setReplayToDelete] = useState<UserReplayData | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      // Handle null user (edge case)
      if (!session?.user) {
        setIsLoading(false);
        router.push('/login?callbackUrl=/my-replays');
        return;
      }

      // Check if user has Coach or Owner role
      const userRole = session.user.role;
      if (userRole !== 'Coach' && userRole !== 'Owner') {
        setIsLoading(false);
        router.push('/subscribe?feature=my-replays');
        return;
      }
      fetchReplays();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
      router.push('/login?callbackUrl=/my-replays');
    }
  }, [status, session?.user, router]);

  const fetchReplays = async () => {
    try {
      const [replaysResponse, settingsResponse] = await Promise.all([
        fetch('/api/my-replays'),
        fetch('/api/settings'),
      ]);

      const replaysData = await replaysResponse.json();

      if (!replaysResponse.ok) {
        throw new Error(replaysData.error || 'Failed to fetch replays');
      }

      setReplays(replaysData.replays || []);

      // Settings endpoint might not exist yet, handle gracefully
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setUserSettings(settingsData.settings || null);
      } else {
        console.warn('Settings endpoint not available yet');
        setUserSettings(null);
      }
    } catch (err) {
      console.error('Error fetching replays:', err);
      setError(err instanceof Error ? err.message : 'Failed to load replays');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPlayerName = async (playerName: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_player_name',
          player_name: playerName,
        }),
      });

      if (!response.ok) throw new Error('Failed to confirm player name');

      // Refresh settings
      const settingsResponse = await fetch('/api/settings');
      const settingsData = await settingsResponse.json();
      setUserSettings(settingsData.settings || null);
    } catch (err) {
      console.error('Error confirming player name:', err);
      setError('Failed to confirm player name');
    }
  };

  const handleRejectPlayerName = async (playerName: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_player_name',
          player_name: playerName,
        }),
      });

      if (!response.ok) throw new Error('Failed to reject player name');

      // Refresh settings
      const settingsResponse = await fetch('/api/settings');
      const settingsData = await settingsResponse.json();
      setUserSettings(settingsData.settings || null);
    } catch (err) {
      console.error('Error rejecting player name:', err);
      setError('Failed to reject player name');
    }
  };

  const handleDelete = async () => {
    if (!replayToDelete) return;

    try {
      const response = await fetch(`/api/my-replays?replay_id=${replayToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      setReplays((prev) => prev.filter((r) => r.id !== replayToDelete.id));
      setDeleteDialogOpen(false);
      setReplayToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete replay');
    }
  };

  const confirmDelete = (replay: UserReplayData) => {
    setReplayToDelete(replay);
    setDeleteDialogOpen(true);
  };

  // Extract unique values for filters
  const uniqueGameTypes = useMemo(() => {
    return Array.from(new Set(replays.map((r) => r.game_type).filter(Boolean))).sort() as string[];
  }, [replays]);

  // Build counts for the filter display
  const buildCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    replays.forEach((r) => {
      if (r.detection) {
        counts[r.detection.build_name] = (counts[r.detection.build_name] || 0) + 1;
      }
    });
    return counts;
  }, [replays]);

  const uniqueBuilds = useMemo(() => {
    return Object.keys(buildCounts).sort();
  }, [buildCounts]);

  const undetectedCount = useMemo(() => {
    return replays.filter((r) => !r.detection).length;
  }, [replays]);

  const detectedCount = useMemo(() => {
    return replays.filter((r) => r.detection).length;
  }, [replays]);

  // Get matchup counts and available races for dynamic filtering
  const matchupData = useMemo(() => {
    const matchupCounts: Record<string, number> = {};
    replays.forEach((r) => {
      const matchup = r.fingerprint.matchup;
      matchupCounts[matchup] = (matchupCounts[matchup] || 0) + 1;
    });

    // Determine which races have replays (checking the first letter of matchups)
    const hasRace = {
      terran: Object.keys(matchupCounts).some((m) => m.startsWith('T')),
      zerg: Object.keys(matchupCounts).some((m) => m.startsWith('Z')),
      protoss: Object.keys(matchupCounts).some((m) => m.startsWith('P')),
    };

    return { matchupCounts, hasRace };
  }, [replays]);

  // Filtering logic
  const filteredReplays = useMemo(() => {
    return replays.filter((replay) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          replay.filename.toLowerCase().includes(searchLower) ||
          replay.fingerprint.metadata.map.toLowerCase().includes(searchLower) ||
          (replay.detection?.build_name || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Game type filter
      if (filters.gameType.length > 0) {
        if (!replay.game_type || !filters.gameType.includes(replay.game_type)) {
          return false;
        }
      }

      // Matchup filter (hierarchical: supports both parent race and specific matchup)
      if (filters.matchup.length > 0) {
        const replayMatchup = replay.fingerprint.matchup;
        const matchesFilter = filters.matchup.some((selected) => {
          // Direct matchup match (e.g., "TvP")
          if (selected === replayMatchup) return true;
          // Parent race match (e.g., "terran" matches "TvP", "TvZ", "TvT")
          if (selected === 'terran' && replayMatchup.startsWith('T')) return true;
          if (selected === 'zerg' && replayMatchup.startsWith('Z')) return true;
          if (selected === 'protoss' && replayMatchup.startsWith('P')) return true;
          return false;
        });
        if (!matchesFilter) return false;
      }

      // Result filter (singular: Won or Lost)
      if (filters.result.length > 0) {
        const result = replay.fingerprint.metadata.result;
        // Map "Win" -> "won", "Loss" -> "lost" for filter matching
        const normalizedResult = result === 'Win' ? 'won' : 'lost';
        if (!filters.result.includes(normalizedResult)) {
          return false;
        }
      }

      // Build filter (hierarchical: undetected, detected, or specific build names)
      if (filters.build.length > 0) {
        const hasDetection = !!replay.detection;
        const buildName = replay.detection?.build_name;

        // Check if any filter matches
        const matchesBuildFilter = filters.build.some((selected) => {
          if (selected === 'undetected') return !hasDetection;
          if (selected === 'detected') return hasDetection;
          // Specific build name match
          return buildName === selected;
        });
        if (!matchesBuildFilter) return false;
      }

      return true;
    });
  }, [replays, searchQuery, filters]);

  // Sort replays by date played (newest first)
  const sortedReplays = useMemo(() => {
    return [...filteredReplays].sort((a, b) => {
      // Use game_date from fingerprint metadata, fall back to uploaded_at
      const dateA = a.fingerprint.metadata.game_date || a.game_metadata?.game_date || a.uploaded_at;
      const dateB = b.fingerprint.metadata.game_date || b.game_metadata?.game_date || b.uploaded_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [filteredReplays]);

  const setFilter = (key: string, value: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({ matchup: [], result: [], build: [], gameType: [] });
  };

  // Filter sections configuration
  const filterSections = [
    // Game Type filter
    ...(uniqueGameTypes.length > 0
      ? [
          {
            id: 'gameType',
            label: 'Game Type',
            items: uniqueGameTypes.map((gt) => ({
              id: gt,
              label: gt.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            })),
          },
        ]
      : []),
    // Hierarchical Matchup filter (only show races/matchups that have replays)
    {
      id: 'matchup',
      label: 'Race',
      items: [
        ...(matchupData.hasRace.terran
          ? [
              {
                id: 'terran',
                label: 'Terran',
                children: [
                  ...(matchupData.matchupCounts['TvT'] ? [{ id: 'TvT', label: `vs Terran (${matchupData.matchupCounts['TvT']})` }] : []),
                  ...(matchupData.matchupCounts['TvZ'] ? [{ id: 'TvZ', label: `vs Zerg (${matchupData.matchupCounts['TvZ']})` }] : []),
                  ...(matchupData.matchupCounts['TvP'] ? [{ id: 'TvP', label: `vs Protoss (${matchupData.matchupCounts['TvP']})` }] : []),
                ],
              },
            ]
          : []),
        ...(matchupData.hasRace.zerg
          ? [
              {
                id: 'zerg',
                label: 'Zerg',
                children: [
                  ...(matchupData.matchupCounts['ZvT'] ? [{ id: 'ZvT', label: `vs Terran (${matchupData.matchupCounts['ZvT']})` }] : []),
                  ...(matchupData.matchupCounts['ZvZ'] ? [{ id: 'ZvZ', label: `vs Zerg (${matchupData.matchupCounts['ZvZ']})` }] : []),
                  ...(matchupData.matchupCounts['ZvP'] ? [{ id: 'ZvP', label: `vs Protoss (${matchupData.matchupCounts['ZvP']})` }] : []),
                ],
              },
            ]
          : []),
        ...(matchupData.hasRace.protoss
          ? [
              {
                id: 'protoss',
                label: 'Protoss',
                children: [
                  ...(matchupData.matchupCounts['PvT'] ? [{ id: 'PvT', label: `vs Terran (${matchupData.matchupCounts['PvT']})` }] : []),
                  ...(matchupData.matchupCounts['PvZ'] ? [{ id: 'PvZ', label: `vs Zerg (${matchupData.matchupCounts['PvZ']})` }] : []),
                  ...(matchupData.matchupCounts['PvP'] ? [{ id: 'PvP', label: `vs Protoss (${matchupData.matchupCounts['PvP']})` }] : []),
                ],
              },
            ]
          : []),
      ],
    },
    // Singular Result filter
    {
      id: 'result',
      label: 'Result',
      singleSelect: true,
      items: [
        { id: 'won', label: 'Won' },
        { id: 'lost', label: 'Lost' },
      ],
    },
    // Build Detection filter (Undetected first, then Detected with children)
    {
      id: 'build',
      label: 'Build Detection',
      items: [
        { id: 'undetected', label: `Undetected Build${undetectedCount > 0 ? ` (${undetectedCount})` : ''}` },
        {
          id: 'detected',
          label: `Detected Build${detectedCount > 0 ? ` (${detectedCount})` : ''}`,
          children: uniqueBuilds.map((b) => ({
            id: b,
            label: `${b} (${buildCounts[b]})`,
          })),
        },
      ],
    },
  ];

  // Convert filters to selectedItems format for FilterSidebar
  const selectedItems = useMemo(() => {
    return filters;
  }, [filters]);

  // Find next player name suggestion (must have 3+ occurrences)
  const nextSuggestion = useMemo(() => {
    if (!userSettings) return null;

    const possibleNames = userSettings.possible_player_names || {};
    const confirmedNames = userSettings.confirmed_player_names || [];

    // Find names with 3+ occurrences that aren't confirmed
    const suggestions = Object.entries(possibleNames)
      .filter(([name, count]) => count >= 3 && !confirmedNames.includes(name))
      .sort((a, b) => b[1] - a[1]); // Sort by count descending

    return suggestions.length > 0 ? { name: suggestions[0][0], count: suggestions[0][1] } : null;
  }, [userSettings]);

  // Handle selection changes from FilterSidebar
  const handleSelectionChange = (newSelectedItems: Record<string, string[]>) => {
    setFilters(newSelectedItems);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!session || !session.user) {
    return null;
  }

  // Filter sidebar content
  const filterContent = (
    <FilterSidebar
      searchEnabled={true}
      searchPlaceholder="Search replays..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={handleSelectionChange}
    />
  );

  // List content (table view)
  const tableContent = (
    <>
      {nextSuggestion && (
        <div className="mb-6">
          <PlayerNameSuggestionCard
            playerName={nextSuggestion.name}
            count={nextSuggestion.count}
            onConfirm={handleConfirmPlayerName}
            onReject={handleRejectPlayerName}
          />
        </div>
      )}
      <MyReplaysTable
        replays={sortedReplays}
        onDelete={confirmDelete}
        confirmedPlayerNames={userSettings?.confirmed_player_names || []}
      />
    </>
  );

  // Overview content (stats view)
  const gridContent = (
    <>
      {nextSuggestion && (
        <div className="mb-6">
          <PlayerNameSuggestionCard
            playerName={nextSuggestion.name}
            count={nextSuggestion.count}
            onConfirm={handleConfirmPlayerName}
            onReject={handleRejectPlayerName}
          />
        </div>
      )}
      <MyReplaysOverview
        replays={sortedReplays}
        confirmedPlayerNames={userSettings?.confirmed_player_names || []}
        userId={session?.user?.discordId}
      />
    </>
  );

  return (
    <>
      <FilterableContentLayout
        title="My Replays"
        description="Track your replays, view auto-detected builds, and analyze your execution scores."
        pageKey="my-replays"
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="grid"
        showViewToggle={true}
        gridLabel="Overview"
        tableLabel="List"
        gridIcon="chart"
        tableIcon="list"
        filters={filters}
        searchQuery={searchQuery}
        selectedTags={[]}
        onClearFilters={clearFilters}
        onRemoveFilter={(key) => setFilter(key, [])}
        onRemoveFilterValue={(key, value) => {
          const currentValues = filters[key] || [];
          setFilter(key, currentValues.filter((v) => v !== value));
        }}
        onClearSearch={() => setSearchQuery('')}
        onRemoveTag={() => {}}
        filterLabels={{}}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Replay?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this replay. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReplayToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
