'use client';

/**
 * Metrics Trends Chart - Time-series visualization of supply/production scores
 *
 * Displays trends over time with toggleable time periods:
 * - Daily, Weekly, Monthly, All-Time views
 * - Win rate, supply score, production score lines
 * - Async computation with IndexedDB caching
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ReplayIndexEntry } from '@/lib/replay-types';
import {
  buildTimeSeriesData,
  buildTimeSeriesDataAsync,
  type TimePeriod,
  type TimeSeriesData,
} from '@/lib/replay-time-series';
import {
  loadTimeSeriesWithCache,
  isIndexedDBAvailable,
} from '@/lib/replay-cache';
import { useMetricsTrendsPreferences } from '@/hooks/use-chart-preferences';

// ============================================================================
// Types
// ============================================================================

interface MetricsTrendsChartProps {
  replays: ReplayIndexEntry[];
  userId: string;
  availableMatchups?: string[];  // List of available matchups for filtering
  availableBuilds?: string[];    // List of available build names for filtering
  className?: string;
  title?: string;
  showWinRate?: boolean;
  showSupplyBlockTime?: boolean;
  showProductionIdleTime?: boolean;
}

interface ChartDataPoint {
  label: string;
  date: string;
  winRate: number | null;
  supplyBlockTime: number | null;      // seconds
  productionIdleTime: number | null;   // seconds
  replayCount: number;
}

// ============================================================================
// Period Toggle Button
// ============================================================================

const periodOptions: { value: TimePeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all-time', label: 'All Time' },
];

function PeriodToggle({
  value,
  onChange,
}: {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {periodOptions.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 px-3 text-xs',
            value === option.value && 'bg-background shadow-sm'
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// Custom Tooltip
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

/**
 * Format seconds as human-readable time string
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const replayCount = (payload[0] as unknown as { payload: ChartDataPoint })?.payload?.replayCount;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 font-medium">{label}</p>
      <p className="mb-2 text-xs text-muted-foreground">{replayCount} games</p>
      {payload.map((entry) => {
        let formattedValue = 'N/A';
        if (entry.value !== null) {
          if (entry.dataKey === 'winRate') {
            formattedValue = `${entry.value.toFixed(1)}%`;
          } else {
            // Time-based metrics (supplyBlockTime, productionIdleTime)
            formattedValue = formatTime(entry.value);
          }
        }
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{formattedValue}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MetricsTrendsChart({
  replays,
  userId,
  availableMatchups,
  availableBuilds,
  className,
  title = 'Performance Trends',
  showWinRate = true,
  showSupplyBlockTime = true,
  showProductionIdleTime = true,
}: MetricsTrendsChartProps) {
  // Use persisted preferences
  const {
    period,
    setPeriod,
    matchup: selectedMatchup,
    setMatchup: setSelectedMatchup,
    build: selectedBuild,
    setBuild: setSelectedBuild,
  } = useMetricsTrendsPreferences();

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  // Derive available matchups from replays if not provided
  const matchups = useMemo(() => {
    if (availableMatchups) return availableMatchups;
    const unique = new Set(replays.map(r => r.matchup).filter(Boolean));
    return Array.from(unique).sort();
  }, [replays, availableMatchups]);

  // Derive available builds from replays if not provided
  const builds = useMemo(() => {
    if (availableBuilds) return availableBuilds;
    const unique = new Set(replays.map(r => r.detected_build).filter(Boolean) as string[]);
    return Array.from(unique).sort();
  }, [replays, availableBuilds]);

  // Filter replays based on selection
  const filteredReplays = useMemo(() => {
    let result = replays;
    if (selectedMatchup) {
      result = result.filter(r => r.matchup === selectedMatchup);
    }
    if (selectedBuild) {
      result = result.filter(r => r.detected_build === selectedBuild);
    }
    return result;
  }, [replays, selectedMatchup, selectedBuild]);

  // Extract replay IDs for cache validation
  const replayIds = useMemo(() => filteredReplays.map((r) => r.id), [filteredReplays]);

  // Load data with caching
  const loadData = useCallback(async () => {
    setLoading(true);

    if (filteredReplays.length === 0) {
      setTimeSeriesData(null);
      setLoading(false);
      return;
    }

    // Try cache-aware loading if IndexedDB is available
    if (isIndexedDBAvailable()) {
      try {
        const result = await loadTimeSeriesWithCache(
          userId,
          period,
          selectedMatchup, // Filter by matchup for cache key
          replayIds,
          () => buildTimeSeriesData(filteredReplays, period)
        );
        setTimeSeriesData(result.data);
        setFromCache(result.fromCache);
        setLoading(false);
        return;
      } catch (error) {
        console.warn('Cache loading failed, falling back to direct compute:', error);
      }
    }

    // Fallback: compute asynchronously
    buildTimeSeriesDataAsync(
      filteredReplays,
      period,
      (data) => {
        setTimeSeriesData(data);
        setFromCache(false);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to build time-series data:', error);
        setLoading(false);
      }
    );
  }, [filteredReplays, period, userId, replayIds, selectedMatchup]);

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Transform data for chart
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!timeSeriesData) return [];

    return timeSeriesData.dataPoints.map((dp) => ({
      label: dp.label,
      date: dp.date,
      winRate: dp.winRate,
      supplyBlockTime: dp.avgSupplyBlockTime,
      productionIdleTime: dp.avgProductionIdleTime,
      replayCount: dp.replayCount,
    }));
  }, [timeSeriesData]);

  // Calculate max time for Y-axis scale
  const maxTimeValue = useMemo(() => {
    if (!chartData.length) return 60;
    const maxSupply = Math.max(...chartData.map(d => d.supplyBlockTime ?? 0));
    const maxProd = Math.max(...chartData.map(d => d.productionIdleTime ?? 0));
    const max = Math.max(maxSupply, maxProd);
    // Round up to nearest 30 seconds
    return Math.max(60, Math.ceil(max / 30) * 30);
  }, [chartData]);

  // Summary stats
  const summary = useMemo(() => {
    if (!timeSeriesData) return null;

    return {
      totalGames: timeSeriesData.totals.replayCount,
      overallWinRate: timeSeriesData.totals.winRate,
      avgSupplyBlockTime: timeSeriesData.totals.avgSupplyBlockTime,
      avgProductionIdleTime: timeSeriesData.totals.avgProductionIdleTime,
    };
  }, [timeSeriesData]);

  // Render loading skeleton
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Skeleton className="h-9 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filter dropdowns component
  const FilterControls = () => (
    <div className="flex flex-wrap items-center gap-2">
      {/* Matchup Filter */}
      {matchups.length > 0 && (
        <Select
          value={selectedMatchup || 'all'}
          onValueChange={(v) => setSelectedMatchup(v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Matchup" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Matchups</SelectItem>
            {matchups.map((m) => (
              <SelectItem key={m} value={m || 'unknown'}>{m || 'Unknown'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Build Filter */}
      {builds.length > 0 && (
        <Select
          value={selectedBuild || 'all'}
          onValueChange={(v) => setSelectedBuild(v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Build" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Builds</SelectItem>
            {builds.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <PeriodToggle value={period} onChange={setPeriod} />
    </div>
  );

  // Render empty state
  if (replays.length === 0 || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <FilterControls />
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {filteredReplays.length === 0 && (selectedMatchup || selectedBuild)
              ? 'No replays match the selected filters'
              : 'No replay data available for this time period'
            }
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          {fromCache && (
            <span className="text-xs text-muted-foreground">(cached)</span>
          )}
          {(selectedMatchup || selectedBuild) && (
            <span className="text-xs text-muted-foreground">
              ({selectedMatchup}{selectedMatchup && selectedBuild ? ', ' : ''}{selectedBuild})
            </span>
          )}
        </div>
        <FilterControls />
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {summary && (
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Games:</span>{' '}
              <span className="font-medium">{summary.totalGames}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Win Rate:</span>{' '}
              <span className="font-medium">
                {Number.isFinite(summary.overallWinRate) ? `${summary.overallWinRate.toFixed(1)}%` : '--'}
              </span>
            </div>
            {summary.avgSupplyBlockTime !== null && (
              <div>
                <span className="text-muted-foreground">Avg Supply Block:</span>{' '}
                <span className="font-medium">{formatTime(summary.avgSupplyBlockTime)}</span>
              </div>
            )}
            {summary.avgProductionIdleTime !== null && (
              <div>
                <span className="text-muted-foreground">Avg Prod Idle:</span>{' '}
                <span className="font-medium">{formatTime(summary.avgProductionIdleTime)}</span>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 60, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ className: 'stroke-muted' }}
              />
              {/* Left Y-axis for Win Rate (0-100%) */}
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ className: 'stroke-muted' }}
                tickFormatter={(value) => `${value}%`}
              />
              {/* Right Y-axis for Time (seconds) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, maxTimeValue]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ className: 'stroke-muted' }}
                tickFormatter={(value) => `${value}s`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Reference line at 50% win rate */}
              <ReferenceLine yAxisId="left" y={50} stroke="#666" strokeDasharray="3 3" />

              {/* Win Rate Line (left axis) */}
              {showWinRate && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="winRate"
                  name="Win Rate %"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              )}

              {/* Supply Block Time Line (right axis) - lower is better */}
              {showSupplyBlockTime && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="supplyBlockTime"
                  name="Supply Block (s)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              )}

              {/* Production Idle Time Line (right axis) - lower is better */}
              {showProductionIdleTime && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="productionIdleTime"
                  name="Prod Idle (s)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricsTrendsChart;
