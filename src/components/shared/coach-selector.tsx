'use client';

import { coaches as coachesData } from '@/lib/data';

interface CoachSelectorProps {
  value: string;
  onChange: (coachId: string) => void;
  className?: string;
  allowNone?: boolean; // Allow "No coach" option
}

/**
 * Reusable coach selector dropdown
 * Used in modals for selecting a coach for content (videos, events, etc.)
 */
export function CoachSelector({ value, onChange, className = '', allowNone = true }: CoachSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent ${className}`}
    >
      {allowNone && <option value="">No coach</option>}
      {coachesData.map((coach) => (
        <option key={coach.id} value={coach.id}>
          {coach.displayName}
        </option>
      ))}
    </select>
  );
}
