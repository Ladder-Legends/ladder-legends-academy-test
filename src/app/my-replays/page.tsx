/**
 * My Replays Page - Enhanced
 * Comprehensive replay tracking with charts, filters, search, and management
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, TrendingUp, Trophy, Target, Calendar, Search, Trash2,
  Filter, X, BarChart3, LineChart
} from 'lucide-react';
import Link from 'next/link';
import type { UserReplayData } from '@/lib/replay-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MyReplaysPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [replays, setReplays] = useState<UserReplayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [matchupFilter, setMatchupFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [buildFilter, setBuildFilter] = useState<string>('all');

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [replayToDelete, setReplayToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReplays();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  const fetchReplays = async () => {
    try {
      const response = await fetch('/api/my-replays');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch replays');
      }

      setReplays(data.replays || []);
    } catch (err) {
      console.error('Error fetching replays:', err);
      setError(err instanceof Error ? err.message : 'Failed to load replays');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!replayToDelete) return;

    try {
      const response = await fetch(`/api/my-replays?replay_id=${replayToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      // Remove from local state
      setReplays((prev) => prev.filter((r) => r.id !== replayToDelete));
      setDeleteDialogOpen(false);
      setReplayToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete replay');
    }
  };

  const confirmDelete = (replayId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplayToDelete(replayId);
    setDeleteDialogOpen(true);
  };

  // Filtering logic
  const filteredReplays = useMemo(() => {
    return replays.filter((replay) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        replay.filename.toLowerCase().includes(searchLower) ||
        replay.fingerprint.metadata.map.toLowerCase().includes(searchLower) ||
        (replay.detection?.build_name || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Matchup filter
      if (matchupFilter !== 'all' && replay.fingerprint.matchup !== matchupFilter) {
        return false;
      }

      // Result filter
      if (resultFilter !== 'all' && replay.fingerprint.metadata.result !== resultFilter) {
        return false;
      }

      // Build filter
      if (buildFilter !== 'all') {
        if (buildFilter === 'detected' && !replay.detection) return false;
        if (buildFilter === 'undetected' && replay.detection) return false;
      }

      return true;
    });
  }, [replays, searchQuery, matchupFilter, resultFilter, buildFilter]);

  // Extract unique matchups and builds
  const matchups = useMemo(() => {
    return Array.from(new Set(replays.map((r) => r.fingerprint.matchup))).sort();
  }, [replays]);

  const builds = useMemo(() => {
    return Array.from(
      new Set(replays.filter((r) => r.detection).map((r) => r.detection!.build_name))
    ).sort();
  }, [replays]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setMatchupFilter('all');
    setResultFilter('all');
    setBuildFilter('all');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    matchupFilter !== 'all' ||
    resultFilter !== 'all' ||
    buildFilter !== 'all';

  // Stats calculations
  const totalReplays = replays.length;
  const wins = replays.filter((r) => r.fingerprint.metadata.result === 'Win').length;
  const losses = replays.filter((r) => r.fingerprint.metadata.result === 'Loss').length;
  const avgScore = replays
    .filter((r) => r.comparison !== null)
    .reduce((sum, r) => sum + (r.comparison?.execution_score || 0), 0) /
    (replays.filter((r) => r.comparison).length || 1);

  // Supply block severity stats
  const supplyBlockStats = useMemo(() => {
    let totalMinor = 0;
    let totalWarning = 0;
    let totalProblem = 0;

    replays.forEach((replay) => {
      const cat = replay.fingerprint.economy.supply_block_categorization;
      if (cat) {
        totalMinor += cat.minor_count;
        totalWarning += cat.warning_count;
        totalProblem += cat.problem_count;
      }
    });

    return { totalMinor, totalWarning, totalProblem };
  }, [replays]);

  // Time series data for charts
  const chartData = useMemo(() => {
    const sortedReplays = [...replays].sort((a, b) =>
      new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
    );

    return sortedReplays.map((replay, idx) => {
      const winsUpTo = sortedReplays.slice(0, idx + 1).filter((r) => r.fingerprint.metadata.result === 'Win').length;
      const gamesUpTo = idx + 1;

      // Calculate severity breakdown for supply blocks
      const categorization = replay.fingerprint.economy.supply_block_categorization;
      const supplyBlockSeverity = categorization
        ? {
            minor: categorization.minor_count,
            warning: categorization.warning_count,
            problem: categorization.problem_count,
            total: replay.fingerprint.economy.supply_block_count || 0,
          }
        : {
            minor: 0,
            warning: 0,
            problem: 0,
            total: replay.fingerprint.economy.supply_block_count || 0,
          };

      return {
        date: new Date(replay.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        winRate: Math.round((winsUpTo / gamesUpTo) * 100),
        executionScore: replay.comparison?.execution_score || null,
        supplyBlocks: replay.fingerprint.economy.supply_block_count || 0,
        supplyBlockSeverity,
        workers3min: replay.fingerprint.economy.workers_3min || 0,
        workers5min: replay.fingerprint.economy.workers_5min || 0,
      };
    });
  }, [replays]);

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

  // Check authentication
  if (!session) {
    router.push('/login?callbackUrl=/my-replays');
    return null;
  }

  // Check if user is Coach or Owner only (my-replays restricted to coaches)
  const isCoachOrOwner = session.user?.role === 'Coach' || session.user?.role === 'Owner';

  if (!isCoachOrOwner) {
    router.push('/subscribe?feature=my-replays');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Replays</h1>
          <p className="text-muted-foreground">
            Track your progress and improve your build execution
          </p>
        </div>
        <Link href="/my-replays/upload">
          <Button size="lg">
            <Upload className="mr-2 h-4 w-4" />
            Upload Replay
          </Button>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {totalReplays === 0 && !error && (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No replays yet</h3>
            <p className="text-muted-foreground mb-6">
              Upload your first replay to start tracking your progress
            </p>
            <Link href="/my-replays/upload">
              <Button size="lg">
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Replay
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Tabs */}
      {totalReplays > 0 && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">
              <BarChart3 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="replays">
              <Target className="mr-2 h-4 w-4" />
              All Replays ({filteredReplays.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Replays</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReplays}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Win Rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalReplays > 0 ? Math.round((wins / totalReplays) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {wins}W - {losses}L
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Execution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {avgScore > 0 ? Math.round(avgScore) : '-'}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {replays.filter((r) => r.comparison).length} analyzed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Supply Blocks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span className="text-sm font-semibold">{supplyBlockStats.totalMinor}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-sm font-semibold">{supplyBlockStats.totalWarning}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-sm font-semibold">{supplyBlockStats.totalProblem}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total across {totalReplays} games
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Latest Upload</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {replays[0]
                      ? new Date(replays[0].uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '-'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Win Rate Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Win Rate Progress
                  </CardTitle>
                  <CardDescription>Your win rate over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-1">
                    {chartData.slice(-20).map((point, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-primary/20 rounded-t relative" style={{ height: '100%' }}>
                          <div
                            className="w-full bg-primary rounded-t absolute bottom-0"
                            style={{ height: `${point.winRate}%` }}
                          />
                        </div>
                        {idx % 3 === 0 && (
                          <span className="text-xs text-muted-foreground rotate-45 origin-top-left">
                            {point.date}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-4 text-sm text-muted-foreground">
                    Last 20 games
                  </div>
                </CardContent>
              </Card>

              {/* Supply Blocks Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Supply Block Trend
                  </CardTitle>
                  <CardDescription>Supply blocks per game by severity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-1">
                    {chartData.slice(-20).map((point, idx) => {
                      const maxBlocks = 10;
                      const severity = point.supplyBlockSeverity;
                      const total = severity.total;

                      // Calculate heights as percentages
                      const problemHeight = total > 0 ? (severity.problem / maxBlocks) * 100 : 0;
                      const warningHeight = total > 0 ? (severity.warning / maxBlocks) * 100 : 0;
                      const minorHeight = total > 0 ? (severity.minor / maxBlocks) * 100 : 0;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full relative" style={{ height: '100%' }}>
                            {/* Stacked bars: problem (red) on top, warning (orange) middle, minor (yellow) bottom */}
                            <div className="absolute bottom-0 w-full flex flex-col">
                              {severity.minor > 0 && (
                                <div
                                  className="w-full bg-yellow-500/80"
                                  style={{ height: `${Math.min(minorHeight, 100)}%` }}
                                  title={`${severity.minor} minor blocks`}
                                />
                              )}
                              {severity.warning > 0 && (
                                <div
                                  className="w-full bg-orange-500/80"
                                  style={{ height: `${Math.min(warningHeight, 100)}%` }}
                                  title={`${severity.warning} warning blocks`}
                                />
                              )}
                              {severity.problem > 0 && (
                                <div
                                  className="w-full bg-red-500/80 rounded-t"
                                  style={{ height: `${Math.min(problemHeight, 100)}%` }}
                                  title={`${severity.problem} problem blocks`}
                                />
                              )}
                            </div>
                          </div>
                          {idx % 3 === 0 && (
                            <span className="text-xs text-muted-foreground rotate-45 origin-top-left">
                              {point.date}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500/80 rounded" />
                      <span className="text-muted-foreground">Minor (&lt;30s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500/80 rounded" />
                      <span className="text-muted-foreground">Warning (30-60s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500/80 rounded" />
                      <span className="text-muted-foreground">Problem (60s+)</span>
                    </div>
                  </div>
                  <div className="text-center mt-2 text-sm text-muted-foreground">
                    Last 20 games (max 10 shown)
                  </div>
                </CardContent>
              </Card>

              {/* Execution Score Trend */}
              {replays.some((r) => r.comparison) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Execution Score Trend
                    </CardTitle>
                    <CardDescription>Build execution improvement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end justify-between gap-1">
                      {chartData
                        .filter((p) => p.executionScore !== null)
                        .slice(-20)
                        .map((point, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-green-500/20 rounded-t relative" style={{ height: '100%' }}>
                              <div
                                className="w-full bg-green-500 rounded-t absolute bottom-0"
                                style={{ height: `${point.executionScore}%` }}
                              />
                            </div>
                            {idx % 3 === 0 && (
                              <span className="text-xs text-muted-foreground rotate-45 origin-top-left">
                                {point.date}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                    <div className="text-center mt-4 text-sm text-muted-foreground">
                      Last 20 analyzed games
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Worker Counts Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Worker Counts vs Benchmark
                  </CardTitle>
                  <CardDescription>3min and 5min worker counts with benchmark lines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative h-64">
                    {/* Benchmark lines - Speed Banshee benchmarks */}
                    <div
                      className="absolute w-full border-t-2 border-dashed border-green-500/40"
                      style={{ bottom: `${(12 / 60) * 100}%` }}
                      title="Benchmark: 12 workers @ 3min"
                    />
                    <div
                      className="absolute w-full border-t-2 border-dashed border-emerald-500/40"
                      style={{ bottom: `${(29 / 60) * 100}%` }}
                      title="Benchmark: 29 workers @ 5min"
                    />

                    {/* Bars */}
                    <div className="h-full flex items-end justify-between gap-1">
                      {chartData.slice(-20).map((point, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full relative" style={{ height: '100%' }}>
                            <div
                              className="w-1/2 bg-blue-500 rounded-tl absolute bottom-0 left-0"
                              style={{ height: `${(point.workers3min / 60) * 100}%` }}
                              title={`3min: ${point.workers3min} (target: 12)`}
                            />
                            <div
                              className="w-1/2 bg-blue-300 rounded-tr absolute bottom-0 right-0"
                              style={{ height: `${(point.workers5min / 60) * 100}%` }}
                              title={`5min: ${point.workers5min} (target: 29)`}
                            />
                          </div>
                          {idx % 3 === 0 && (
                            <span className="text-xs text-muted-foreground rotate-45 origin-top-left">
                              {point.date}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded" />
                      <span>3min workers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-300 rounded" />
                      <span>5min workers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-0.5 border-t-2 border-dashed border-green-500/60" />
                      <span>Benchmarks</span>
                    </div>
                  </div>
                  <div className="text-center mt-2 text-xs text-muted-foreground">
                    Benchmarks from Speed Banshee Mech build (Advanced)
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Replays Tab */}
          <TabsContent value="replays" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Search */}
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search replays, maps, builds..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Matchup Filter */}
                  <Select value={matchupFilter} onValueChange={setMatchupFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Matchup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Matchups</SelectItem>
                      {matchups.map((matchup) => (
                        <SelectItem key={matchup} value={matchup}>
                          {matchup}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Result Filter */}
                  <Select value={resultFilter} onValueChange={setResultFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Results</SelectItem>
                      <SelectItem value="Win">Wins Only</SelectItem>
                      <SelectItem value="Loss">Losses Only</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Build Filter */}
                  <Select value={buildFilter} onValueChange={setBuildFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Build" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Builds</SelectItem>
                      <SelectItem value="detected">Detected</SelectItem>
                      <SelectItem value="undetected">Undetected</SelectItem>
                      {builds.map((build) => (
                        <SelectItem key={build} value={build}>
                          {build}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Filters */}
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {searchQuery && (
                      <Badge variant="secondary" className="gap-1">
                        Search: {searchQuery}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setSearchQuery('')}
                        />
                      </Badge>
                    )}
                    {matchupFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        {matchupFilter}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setMatchupFilter('all')}
                        />
                      </Badge>
                    )}
                    {resultFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        {resultFilter}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setResultFilter('all')}
                        />
                      </Badge>
                    )}
                    {buildFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        {buildFilter}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setBuildFilter('all')}
                        />
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="ml-auto"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Replay List */}
            <div className="space-y-4">
              {filteredReplays.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No replays found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your filters or search query
                    </p>
                    {hasActiveFilters && (
                      <Button onClick={clearFilters} variant="outline">
                        Clear Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredReplays.map((replay) => (
                  <Card
                    key={replay.id}
                    className="hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/my-replays/${replay.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{replay.filename}</h3>
                            <Badge
                              variant={
                                replay.fingerprint.metadata.result === 'Win'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {replay.fingerprint.metadata.result}
                            </Badge>
                            <Badge variant="outline">{replay.fingerprint.matchup}</Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(replay.uploaded_at).toLocaleDateString()}
                            </div>
                            <div>{replay.fingerprint.metadata.map}</div>
                            <div>
                              {replay.fingerprint.metadata.duration
                                ? `${Math.floor(replay.fingerprint.metadata.duration / 60)}:${String(
                                    Math.floor(replay.fingerprint.metadata.duration % 60)
                                  ).padStart(2, '0')}`
                                : 'N/A'}
                            </div>
                            {replay.fingerprint.economy.supply_block_count !== undefined && (
                              <div>
                                {replay.fingerprint.economy.supply_block_count} supply blocks
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {replay.detection && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">Detected Build</p>
                              <Badge variant="outline" className="font-medium">
                                {replay.detection.build_name}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {Math.round(replay.detection.confidence)}% confidence
                              </p>
                            </div>
                          )}

                          {replay.comparison && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">Execution</p>
                              <div className="text-2xl font-bold">
                                {Math.round(replay.comparison.execution_score)}%
                              </div>
                              <Badge
                                variant={
                                  replay.comparison.tier === 'S' || replay.comparison.tier === 'A'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {replay.comparison.tier}-Tier
                              </Badge>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => confirmDelete(replay.id, e)}
                              title="Delete replay"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this replay. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
