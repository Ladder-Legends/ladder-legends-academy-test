'use client';

/**
 * Matchup Trends Chart - Time-series visualization per matchup
 *
 * Displays win rate trends by matchup with:
 * - Stacked or separate views
 * - Period toggles
 * - Matchup selector
 */

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReplayIndexEntry } from '@/lib/replay-types';
import {
  buildTimeSeriesData,
  type TimePeriod,
} from '@/lib/replay-time-series';

// ============================================================================
// Types
// ============================================================================

interface MatchupTrendsChartProps {
  replays: ReplayIndexEntry[];
  className?: string;
  title?: string;
}

type MatchupDataPoint = {
  label: string;
  counts: Record<string, number>;
} & {
  // Dynamic matchup win rates
  [matchup: string]: number | string | Record<string, number> | undefined;
};

// ============================================================================
// Constants
// ============================================================================

const MATCHUP_COLORS: Record<string, string> = {
  TvT: '#3b82f6', // Blue
  TvZ: '#22c55e', // Green
  TvP: '#f59e0b', // Amber
  ZvZ: '#a855f7', // Purple
  ZvT: '#ef4444', // Red
  ZvP: '#06b6d4', // Cyan
  PvP: '#ec4899', // Pink
  PvT: '#84cc16', // Lime
  PvZ: '#f97316', // Orange
};

const periodOptions: { value: TimePeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// ============================================================================
// Custom Tooltip
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: MatchupDataPoint & { counts: Record<string, number> };
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Sort by win rate descending
  const sortedPayload = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 font-medium">{label}</p>
      {sortedPayload.map((entry) => {
        const counts = entry.payload?.counts;
        const gameCount = counts?.[entry.dataKey] || 0;

        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="w-8">{entry.name}:</span>
            <span className="font-medium">{entry.value?.toFixed(1) || 0}%</span>
            <span className="text-muted-foreground">({gameCount} games)</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MatchupTrendsChart({
  replays,
  className,
  title = 'Win Rate by Matchup',
}: MatchupTrendsChartProps) {
  const [period, setPeriod] = useState<TimePeriod>('weekly');

  // Get unique matchups from replays
  const matchups = useMemo(() => {
    const unique = new Set(replays.map((r) => r.matchup));
    return Array.from(unique).sort();
  }, [replays]);

  // Build data for each matchup
  const chartData = useMemo(() => {
    if (replays.length === 0 || matchups.length === 0) {
      return [];
    }

    // Build time-series for each matchup
    const matchupData: Record<string, Map<string, { winRate: number; count: number }>> = {};

    for (const matchup of matchups) {
      const matchupReplays = replays.filter((r) => r.matchup === matchup);
      const ts = buildTimeSeriesData(matchupReplays, period);

      matchupData[matchup] = new Map();
      for (const dp of ts.dataPoints) {
        matchupData[matchup].set(dp.label, {
          winRate: dp.winRate,
          count: dp.replayCount,
        });
      }
    }

    // Get all unique labels (periods)
    const allLabels = new Set<string>();
    for (const data of Object.values(matchupData)) {
      for (const label of data.keys()) {
        allLabels.add(label);
      }
    }

    // Sort labels chronologically (basic sort works for our label format)
    const sortedLabels = Array.from(allLabels).sort();

    // Build chart data points
    return sortedLabels.map((label) => {
      const dataPoint: MatchupDataPoint & { counts: Record<string, number> } = {
        label,
        counts: {},
      };

      for (const matchup of matchups) {
        const value = matchupData[matchup].get(label);
        if (value) {
          dataPoint[matchup] = value.winRate;
          dataPoint.counts[matchup] = value.count;
        }
      }

      return dataPoint;
    });
  }, [replays, matchups, period]);

  // Calculate overall stats per matchup
  const matchupStats = useMemo(() => {
    const stats: Record<string, { wins: number; total: number; winRate: number }> = {};

    for (const matchup of matchups) {
      const matchupReplays = replays.filter((r) => r.matchup === matchup);
      const wins = matchupReplays.filter((r) => r.result === 'Win').length;
      const total = matchupReplays.length;
      stats[matchup] = {
        wins,
        total,
        winRate: total > 0 ? (wins / total) * 100 : 0,
      };
    }

    return stats;
  }, [replays, matchups]);

  // Render empty state
  if (replays.length === 0 || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            No replay data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-3 text-xs',
                period === option.value && 'bg-background shadow-sm'
              )}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall Stats */}
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          {matchups.map((matchup) => {
            const stats = matchupStats[matchup];
            return (
              <div key={matchup} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: MATCHUP_COLORS[matchup] || '#666' }}
                />
                <span className="font-medium">{matchup}:</span>
                <span>
                  {stats.winRate.toFixed(0)}% ({stats.wins}/{stats.total})
                </span>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ className: 'stroke-muted' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ className: 'stroke-muted' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {matchups.map((matchup) => (
                <Bar
                  key={matchup}
                  dataKey={matchup}
                  name={matchup}
                  fill={MATCHUP_COLORS[matchup] || '#666'}
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fillOpacity={entry[matchup] !== undefined ? 1 : 0}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default MatchupTrendsChart;
