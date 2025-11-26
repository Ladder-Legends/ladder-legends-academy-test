'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Factory, Cog } from 'lucide-react';
import type { ReplayFingerprint } from '@/lib/replay-types';

interface ProductionBreakdownProps {
  fingerprint: ReplayFingerprint;
  gameDuration: number; // in seconds
}

interface BuildingProduction {
  name: string;
  count: number;
  idleSeconds: number;
  idlePercent: number;
}

/**
 * Calculate production breakdown from fingerprint data
 */
function calculateProductionBreakdown(
  fingerprint: ReplayFingerprint,
  gameDuration: number
): BuildingProduction[] {
  const breakdown: BuildingProduction[] = [];

  // Get production buildings from fingerprint
  const productionData = fingerprint.economy?.production_by_building;

  if (productionData && typeof productionData === 'object') {
    for (const [building, data] of Object.entries(productionData)) {
      if (data && typeof data === 'object' && 'idle_seconds' in data) {
        const idleSeconds = data.idle_seconds || 0;
        const count = data.count || 1;
        // Calculate idle percent based on game duration
        const maxProductionTime = gameDuration * count;
        const idlePercent = maxProductionTime > 0 ? (idleSeconds / maxProductionTime) * 100 : 0;

        breakdown.push({
          name: building,
          count,
          idleSeconds,
          idlePercent: Math.round(idlePercent * 10) / 10,
        });
      }
    }
  }

  // Sort by idle time descending
  return breakdown.sort((a, b) => b.idleSeconds - a.idleSeconds);
}

/**
 * Get idle time color based on percentage
 */
function getIdleTimeColor(idlePercent: number): string {
  if (idlePercent <= 5) return 'text-green-600 dark:text-green-400';
  if (idlePercent <= 10) return 'text-yellow-600 dark:text-yellow-400';
  if (idlePercent <= 20) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * ProductionBreakdown - Collapsible section showing per-building production stats
 */
export function ProductionBreakdown({
  fingerprint,
  gameDuration,
}: ProductionBreakdownProps) {
  const [isOpen, setIsOpen] = useState(true);

  const breakdown = calculateProductionBreakdown(fingerprint, gameDuration);
  const economy = fingerprint.economy;

  // Calculate totals
  const totalIdleSeconds = breakdown.reduce((sum, b) => sum + b.idleSeconds, 0);
  const totalBuildings = breakdown.reduce((sum, b) => sum + b.count, 0);

  // Get macro ability efficiency (race-specific)
  const race = fingerprint.race;
  const muleEfficiency = economy?.mule_efficiency ?? null;
  const muleCount = economy?.mule_count ?? null;
  const mulePossible = economy?.mule_possible ?? null;
  const injectEfficiency = economy?.inject_efficiency ?? null;
  const chronoEfficiency = economy?.chrono_efficiency ?? null;

  const hasMacroData = muleEfficiency !== null || injectEfficiency !== null || chronoEfficiency !== null;

  if (breakdown.length === 0 && !hasMacroData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Breakdown
          </CardTitle>
          <CardDescription>No production data available</CardDescription>
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
                <Factory className="h-5 w-5" />
                <CardTitle>Production Breakdown</CardTitle>
              </div>
              {breakdown.length > 0 && (
                <Badge variant="outline" className={getIdleTimeColor(totalIdleSeconds / Math.max(gameDuration, 1) * 100)}>
                  {totalIdleSeconds}s total idle
                </Badge>
              )}
            </div>
            <CardDescription className="ml-10">
              Per-building production efficiency analysis
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Per-building breakdown table */}
            {breakdown.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Building Idle Time</h4>
                <div className="space-y-3">
                  {breakdown.map((building) => (
                    <div key={building.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Cog className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {building.name}
                            {building.count > 1 && (
                              <span className="text-muted-foreground ml-1">×{building.count}</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={getIdleTimeColor(building.idlePercent)}>
                            {building.idleSeconds}s
                          </span>
                          <Badge variant="outline" className={`min-w-[60px] justify-center ${getIdleTimeColor(building.idlePercent)}`}>
                            {building.idlePercent}%
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={100 - building.idlePercent}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>

                {/* Total row */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      Total ({totalBuildings} building{totalBuildings !== 1 ? 's' : ''})
                    </span>
                    <span className={`font-semibold ${getIdleTimeColor(totalIdleSeconds / Math.max(gameDuration, 1) * 100)}`}>
                      {totalIdleSeconds}s idle
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Macro Ability Efficiency */}
            {hasMacroData && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground">Macro Ability Efficiency</h4>

                {/* Terran: MULE */}
                {race === 'Terran' && muleEfficiency !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">MULE Usage</span>
                      <div className="flex items-center gap-2">
                        {muleCount !== null && mulePossible !== null && (
                          <span className="text-muted-foreground">
                            {muleCount} of {mulePossible} possible
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            muleEfficiency >= 85 ? 'text-green-600 dark:text-green-400' :
                            muleEfficiency >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }
                        >
                          {Math.round(muleEfficiency)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={muleEfficiency} className="h-2" />
                  </div>
                )}

                {/* Zerg: Inject */}
                {race === 'Zerg' && injectEfficiency !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Inject Efficiency</span>
                      <Badge
                        variant="outline"
                        className={
                          injectEfficiency >= 85 ? 'text-green-600 dark:text-green-400' :
                          injectEfficiency >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }
                      >
                        {Math.round(injectEfficiency)}%
                      </Badge>
                    </div>
                    <Progress value={injectEfficiency} className="h-2" />
                  </div>
                )}

                {/* Protoss: Chrono */}
                {race === 'Protoss' && chronoEfficiency !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Chrono Boost Usage</span>
                      <Badge
                        variant="outline"
                        className={
                          chronoEfficiency >= 85 ? 'text-green-600 dark:text-green-400' :
                          chronoEfficiency >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }
                      >
                        {Math.round(chronoEfficiency)}%
                      </Badge>
                    </div>
                    <Progress value={chronoEfficiency} className="h-2" />
                  </div>
                )}
              </div>
            )}

            {/* Tips */}
            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p><strong>Scoring:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>0-10s idle: Minor penalty (-1 per second)</li>
                <li>10-30s idle: Medium penalty (-2 per second)</li>
                <li>30s+ idle: Heavy penalty (-3 per second)</li>
                <li>Macro ability efficiency: Up to -20 points</li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
