'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PillarCardProps {
  title: string;
  icon: React.ReactNode;
  score: number | null;
  subtitle: string;
  tooltipContent: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Determines the color class based on the score value
 */
function getScoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 85) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Formats the score for display
 */
function formatScore(score: number | null): string {
  if (score === null) return '--';
  return `${Math.round(score)}%`;
}

/**
 * PillarCard - A card component for displaying a single pillar metric
 * Used in the Three Pillars framework (Vision, Production, Supply)
 */
export function PillarCard({
  title,
  icon,
  score,
  subtitle,
  tooltipContent,
  disabled = false,
  className,
}: PillarCardProps) {
  return (
    <Card className={cn(
      'relative',
      disabled && 'opacity-60',
      className
    )}>
      <CardContent className="pt-6 pb-4 px-4">
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Icon and Title */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-sm">{title}</span>
            {!disabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs p-4">
                    {tooltipContent}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Score */}
          <div className={cn(
            'text-3xl font-bold',
            getScoreColor(disabled ? null : score)
          )}>
            {disabled ? '--' : formatScore(score)}
          </div>

          {/* Subtitle */}
          <p className="text-xs text-muted-foreground">
            {disabled ? 'Coming Soon' : subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Score grade based on percentage
 */
export function getScoreGrade(score: number | null): string {
  if (score === null) return '--';
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}
