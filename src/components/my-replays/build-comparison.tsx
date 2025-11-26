'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, GitCompare, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { ReferenceReplay, ReplayFingerprint } from '@/lib/replay-types';

interface BuildComparisonProps {
  fingerprint: ReplayFingerprint;
  reference: ReferenceReplay;
  comparisonScore?: number;
}

interface TimingDeviation {
  event: string;
  target: number;
  actual: number | null;
  deviation: number;
  status: 'on_time' | 'early' | 'late' | 'very_late' | 'missing';
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate timing deviations between replay and reference
 */
function calculateTimingDeviations(
  replayTimings: Record<string, number | null>,
  referenceTimings: Record<string, number | null>
): TimingDeviation[] {
  const deviations: TimingDeviation[] = [];

  // Get all timing keys from both
  const allKeys = new Set([
    ...Object.keys(replayTimings),
    ...Object.keys(referenceTimings),
  ]);

  for (const key of allKeys) {
    const target = referenceTimings[key];
    const actual = replayTimings[key];

    // Skip if reference doesn't have this timing
    if (target === null || target === undefined) continue;

    if (actual === null || actual === undefined) {
      deviations.push({
        event: key,
        target,
        actual: null,
        deviation: Infinity,
        status: 'missing',
      });
    } else {
      const deviation = actual - target;
      const absDeviation = Math.abs(deviation);

      let status: TimingDeviation['status'];
      if (absDeviation <= 10) {
        status = 'on_time';
      } else if (deviation < 0) {
        status = 'early';
      } else if (absDeviation <= 30) {
        status = 'late';
      } else {
        status = 'very_late';
      }

      deviations.push({
        event: key,
        target,
        actual,
        deviation,
        status,
      });
    }
  }

  // Sort by target time
  return deviations.sort((a, b) => a.target - b.target);
}

/**
 * Get status icon for timing deviation
 */
function getStatusIcon(status: TimingDeviation['status']) {
  switch (status) {
    case 'on_time':
    case 'early':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'late':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'very_late':
    case 'missing':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

/**
 * Get status color for deviation badge
 */
function getDeviationBadgeColor(status: TimingDeviation['status']): string {
  switch (status) {
    case 'on_time':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'early':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'late':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'very_late':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    case 'missing':
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
}

/**
 * Format deviation text
 */
function formatDeviation(deviation: number, status: TimingDeviation['status']): string {
  if (status === 'missing') return 'Missing';
  const sign = deviation > 0 ? '+' : '';
  return `${sign}${Math.round(deviation)}s`;
}

/**
 * BuildComparison - Side-by-side timing comparison against reference build
 */
export function BuildComparison({
  fingerprint,
  reference,
  comparisonScore,
}: BuildComparisonProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Get timings from both fingerprints
  const replayTimings = fingerprint.timings || {};
  const referenceTimings = reference.fingerprint?.timings || {};

  const deviations = calculateTimingDeviations(replayTimings, referenceTimings);

  // Calculate summary stats
  const onTimeCount = deviations.filter(d => d.status === 'on_time' || d.status === 'early').length;
  const lateCount = deviations.filter(d => d.status === 'late').length;
  const veryLateCount = deviations.filter(d => d.status === 'very_late').length;
  const missingCount = deviations.filter(d => d.status === 'missing').length;

  if (deviations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Build Comparison
          </CardTitle>
          <CardDescription>
            vs {reference.alias} - No timing data available for comparison
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <GitCompare className="h-5 w-5" />
                <CardTitle>Build Comparison</CardTitle>
              </div>
              {comparisonScore !== undefined && (
                <Badge
                  variant="outline"
                  className={
                    comparisonScore >= 85 ? 'text-green-600 dark:text-green-400' :
                    comparisonScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }
                >
                  {Math.round(comparisonScore)}% match
                </Badge>
              )}
            </div>
            <CardDescription className="ml-10">
              vs {reference.alias}
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {onTimeCount}
                </div>
                <div className="text-xs text-muted-foreground">On Time</div>
              </div>
              <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {lateCount}
                </div>
                <div className="text-xs text-muted-foreground">Late</div>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                  {veryLateCount}
                </div>
                <div className="text-xs text-muted-foreground">Very Late</div>
              </div>
              <div className="text-center p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
                <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                  {missingCount}
                </div>
                <div className="text-xs text-muted-foreground">Missing</div>
              </div>
            </div>

            {/* Timing Deviations Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Timing Deviations</h4>
              <div className="space-y-2">
                {deviations.map((item) => (
                  <div
                    key={item.event}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      item.status === 'very_late' || item.status === 'missing'
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                        : item.status === 'late'
                        ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <span className="font-medium capitalize">
                        {item.event.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm font-mono">
                        <span className="font-semibold">
                          {item.actual !== null ? formatTime(item.actual) : '--:--'}
                        </span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-muted-foreground">
                          {formatTime(item.target)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`min-w-[70px] justify-center font-mono ${getDeviationBadgeColor(item.status)}`}
                      >
                        {formatDeviation(item.deviation, item.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>On time (±10s)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                <span>Late (10-30s)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-3 w-3 text-red-500" />
                <span>Very late (30s+)</span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
