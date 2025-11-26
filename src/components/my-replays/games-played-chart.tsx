'use client';

/**
 * Games Played Chart - Time-series visualization of game count
 *
 * Shows total games played over time with period toggles
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import { useGamesPlayedPreferences } from '@/hooks/use-chart-preferences';

// ============================================================================
// Types
// ============================================================================

interface GamesPlayedChartProps {
  replays: ReplayIndexEntry[];
  className?: string;
  title?: string;
}

interface ChartDataPoint {
  label: string;
  date: string;
  total: number;
  wins: number;
  losses: number;
}

// ============================================================================
// Constants
// ============================================================================

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
    payload: ChartDataPoint;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 font-medium">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{data.total} games</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Wins:</span>
          <span className="font-medium">{data.wins}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Losses:</span>
          <span className="font-medium">{data.losses}</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t">
          <span className="text-muted-foreground">Win Rate:</span>
          <span className={`font-medium ${winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
            {winRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GamesPlayedChart({
  replays,
  className,
  title = 'Games Played',
}: GamesPlayedChartProps) {
  // Use persisted preferences
  const { period, setPeriod } = useGamesPlayedPreferences();

  // Build chart data
  const chartData = useMemo(() => {
    if (replays.length === 0) return [];

    const ts = buildTimeSeriesData(replays, period);

    return ts.dataPoints.map((dp) => ({
      label: dp.label,
      date: dp.date,
      total: dp.replayCount,
      wins: dp.wins,
      losses: dp.losses,
    }));
  }, [replays, period]);

  // Calculate totals
  const totals = useMemo(() => {
    const total = replays.length;
    const wins = replays.filter(r => r.result === 'Win').length;
    const losses = total - wins;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    return { total, wins, losses, winRate };
  }, [replays]);

  // Get max value for y-axis
  const maxGames = useMemo(() => {
    if (chartData.length === 0) return 10;
    return Math.max(10, Math.ceil(Math.max(...chartData.map(d => d.total)) * 1.2));
  }, [chartData]);

  // Render empty state
  if (replays.length === 0 || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
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
        {/* Summary Stats */}
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total:</span>{' '}
            <span className="font-medium">{totals.total}</span>
          </div>
          <div>
            <span className="text-muted-foreground">W-L:</span>{' '}
            <span className="font-medium">{totals.wins}-{totals.losses}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Win Rate:</span>{' '}
            <span className={`font-medium ${totals.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
              {totals.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[200px] w-full">
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
                domain={[0, maxGames]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ className: 'stroke-muted' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey="total"
                name="Games"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => {
                  const winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
                  // Color bars based on win rate: green for 50%+, red for below
                  const fill = winRate >= 50 ? '#22c55e' : '#ef4444';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default GamesPlayedChart;
