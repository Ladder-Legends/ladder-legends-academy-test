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
  const uniqueMatchups = useMemo(() => {
    return Array.from(new Set(replays.map((r) => r.fingerprint.matchup))).sort();
  }, [replays]);

  const uniqueBuilds = useMemo(() => {
    return Array.from(
      new Set(
        replays
          .filter((r) => r.detection)
          .map((r) => r.detection!.build_name)
      )
    ).sort();
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

      // Matchup filter
      if (filters.matchup.length > 0 && !filters.matchup.includes(replay.fingerprint.matchup)) {
        return false;
      }

      // Result filter
      if (filters.result.length > 0 && !filters.result.includes(replay.fingerprint.metadata.result)) {
        return false;
      }

      // Build filter
      if (filters.build.length > 0) {
        if (filters.build.includes('detected') && !replay.detection) return false;
        if (filters.build.includes('undetected') && replay.detection) return false;
        if (replay.detection && !filters.build.includes(replay.detection.build_name) && !filters.build.includes('detected') && !filters.build.includes('undetected')) {
          return false;
        }
      }

      return true;
    });
  }, [replays, searchQuery, filters]);

  // Sort replays by date (newest first)
  const sortedReplays = useMemo(() => {
    return [...filteredReplays].sort((a, b) => {
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    });
  }, [filteredReplays]);

  const setFilter = (key: string, value: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({ matchup: [], result: [], build: [] });
  };

  // Filter sections configuration
  const filterSections = [
    {
      id: 'matchup',
      label: 'Matchup',
      items: uniqueMatchups.map((m) => ({ id: m, label: m })),
    },
    {
      id: 'result',
      label: 'Result',
      items: [
        { id: 'Win', label: 'Wins' },
        { id: 'Loss', label: 'Losses' },
      ],
    },
    {
      id: 'build',
      label: 'Build Detection',
      items: [
        { id: 'detected', label: 'Detected Builds' },
        { id: 'undetected', label: 'Undetected Builds' },
        ...uniqueBuilds.map((b) => ({ id: b, label: b })),
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
