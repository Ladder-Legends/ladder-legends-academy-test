'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ReplayFingerprint } from '@/lib/replay-types';

interface SupplyBreakdownProps {
  fingerprint: ReplayFingerprint;
  gameDuration: number; // in seconds
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
 * Get severity color
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'problem':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-orange-600 dark:text-orange-400';
    case 'minor':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get severity badge variant
 */
function getSeverityBadge(severity: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string } {
  switch (severity) {
    case 'problem':
      return { variant: 'destructive', label: 'Problem' };
    case 'warning':
      return { variant: 'secondary', label: 'Warning' };
    case 'minor':
      return { variant: 'outline', label: 'Minor' };
    default:
      return { variant: 'outline', label: severity };
  }
}

/**
 * SupplyBreakdown - Collapsible section showing supply block events and checkpoints
 */
export function SupplyBreakdown({
  fingerprint,
  gameDuration,
}: SupplyBreakdownProps) {
  const [isOpen, setIsOpen] = useState(true);

  const economy = fingerprint.economy;
  const blockPeriods = economy?.supply_block_periods || [];
  const blockCount = economy?.supply_block_count ?? 0;
  const totalBlockTime = economy?.total_supply_block_time ?? 0;
  const categorization = economy?.supply_block_categorization;

  // Supply checkpoints from economy data
  const supplyAtCheckpoints = economy?.supply_at_checkpoints;

  // Worker checkpoints
  const workers3min = economy?.workers_3min;
  const workers5min = economy?.workers_5min;
  const workers7min = economy?.workers_7min;

  const hasNoBlocks = blockCount === 0;

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
                <BarChart3 className="h-5 w-5" />
                <CardTitle>Supply Breakdown</CardTitle>
              </div>
              {hasNoBlocks ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  No blocks!
                </Badge>
              ) : (
                <Badge variant="destructive">
                  {blockCount} block{blockCount !== 1 ? 's' : ''} ({Math.round(totalBlockTime)}s)
                </Badge>
              )}
            </div>
            <CardDescription className="ml-10">
              Supply block events and checkpoints analysis
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold">{blockCount}</div>
                <div className="text-xs text-muted-foreground">Total Blocks</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold">{Math.round(totalBlockTime)}s</div>
                <div className="text-xs text-muted-foreground">Time Blocked</div>
              </div>
              {categorization && (
                <>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">
                      {categorization.problem_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Problem (30s+)</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">
                      {categorization.warning_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Warning (10-30s)</div>
                  </div>
                </>
              )}
            </div>

            {/* Block Events Table */}
            {blockPeriods.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Supply Block Events
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead className="w-[100px]">Duration</TableHead>
                      <TableHead className="w-[100px]">Severity</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockPeriods.map((block, index) => {
                      const severity = block.severity || 'minor';
                      const severityInfo = getSeverityBadge(severity);
                      const isEarly = block.start < 300; // Before 5 minutes

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-mono">
                            {formatTime(block.start)}
                          </TableCell>
                          <TableCell className={getSeverityColor(severity)}>
                            {Math.round(block.duration)}s
                          </TableCell>
                          <TableCell>
                            <Badge variant={severityInfo.variant}>
                              {severityInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {isEarly && (
                              <span className="text-orange-500">Early game block (1.5× penalty)</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Supply Timeline Visualization */}
            {blockPeriods.length > 0 && gameDuration > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Timeline</h4>
                <div className="relative h-10 bg-muted/20 rounded-lg border">
                  {/* Time markers */}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 pb-1 text-[10px] text-muted-foreground">
                    <span>0:00</span>
                    {[3, 6, 9, 12].map(minute => {
                      const seconds = minute * 60;
                      if (seconds < gameDuration) {
                        return <span key={minute}>{minute}:00</span>;
                      }
                      return null;
                    })}
                    <span>{formatTime(gameDuration)}</span>
                  </div>

                  {/* Block bars */}
                  {blockPeriods.map((block, index) => {
                    const startPercent = (block.start / gameDuration) * 100;
                    const widthPercent = Math.max((block.duration / gameDuration) * 100, 1);

                    const color = block.severity === 'problem'
                      ? 'bg-red-500'
                      : block.severity === 'warning'
                      ? 'bg-orange-500'
                      : 'bg-yellow-500';

                    return (
                      <div
                        key={index}
                        className={`absolute h-6 top-0 ${color} opacity-80 rounded`}
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        title={`${formatTime(block.start)} - ${Math.round(block.duration)}s (${block.severity})`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-yellow-500 rounded" />
                    <span className="text-muted-foreground">Minor (&lt;10s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-orange-500 rounded" />
                    <span className="text-muted-foreground">Warning (10-30s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span className="text-muted-foreground">Problem (30s+)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Supply Checkpoints */}
            {supplyAtCheckpoints && Object.keys(supplyAtCheckpoints).length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground">Supply at Checkpoints</h4>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(supplyAtCheckpoints)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([time, supply]) => (
                      <div key={time} className="text-center p-2 bg-muted/20 rounded">
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatTime(parseInt(time))}
                        </div>
                        <div className="font-bold">{supply}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Worker Checkpoints */}
            {(workers3min !== null || workers5min !== null || workers7min !== null) && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground">Worker Checkpoints</h4>
                <div className="grid grid-cols-3 gap-4">
                  {workers3min !== null && (
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">3:00</div>
                      <div className="text-xl font-bold">{workers3min}</div>
                      <div className={`text-xs ${workers3min >= 12 ? 'text-green-500' : 'text-orange-500'}`}>
                        ({workers3min >= 12 ? '+' : ''}{workers3min - 12} vs 12)
                      </div>
                    </div>
                  )}
                  {workers5min !== null && (
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">5:00</div>
                      <div className="text-xl font-bold">{workers5min}</div>
                      <div className={`text-xs ${workers5min >= 29 ? 'text-green-500' : 'text-orange-500'}`}>
                        ({workers5min >= 29 ? '+' : ''}{workers5min - 29} vs 29)
                      </div>
                    </div>
                  )}
                  {workers7min !== null && (
                    <div className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">7:00</div>
                      <div className="text-xl font-bold">{workers7min}</div>
                      <div className={`text-xs ${workers7min >= 48 ? 'text-green-500' : 'text-orange-500'}`}>
                        ({workers7min >= 48 ? '+' : ''}{workers7min - 48} vs 48)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scoring Explanation */}
            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p><strong>Scoring:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Each supply block: -10 points</li>
                <li>Per second blocked: -2 points</li>
                <li>Early game block (&lt;5min): 1.5× penalty multiplier</li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
