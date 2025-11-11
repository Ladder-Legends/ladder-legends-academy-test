'use client';

import { useState, useEffect } from 'react';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { TIMEZONES, getTimezoneDisplayName, getBrowserTimezone } from '@/lib/timezone-utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, MapPin } from 'lucide-react';

export function TimezoneSettings() {
  const {
    timezone,
    timezoneSource,
    isLoading,
    error,
    updateTimezone,
    resetToAuto,
  } = useUserTimezone();

  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update selected timezone when hook value changes
  useEffect(() => {
    setSelectedTimezone(timezone);
    setHasChanges(false);
  }, [timezone]);

  const handleTimezoneChange = (newTimezone: string) => {
    setSelectedTimezone(newTimezone);
    setHasChanges(newTimezone !== timezone);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateTimezone(selectedTimezone, 'manual');

    if (success) {
      toast.success('Timezone preference saved');
      setHasChanges(false);
    } else {
      toast.error('Failed to save timezone preference');
    }

    setIsSaving(false);
  };

  const handleResetToAuto = async () => {
    setIsSaving(true);
    const success = await resetToAuto();

    if (success) {
      toast.success('Timezone reset to auto-detect');
      setHasChanges(false);
    } else {
      toast.error('Failed to reset timezone');
    }

    setIsSaving(false);
  };

  const browserTimezone = getBrowserTimezone();
  const isUsingBrowserTimezone = selectedTimezone === browserTimezone;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current timezone info */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
        <MapPin className="w-5 h-5 text-primary mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">Current Timezone</p>
          <p className="text-sm text-muted-foreground">
            {getTimezoneDisplayName(timezone)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {timezoneSource === 'auto' ? (
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Auto-detected from your browser
              </span>
            ) : (
              'Manually set'
            )}
          </p>
        </div>
      </div>

      {/* Timezone selector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Select Timezone
        </label>
        <select
          value={selectedTimezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isSaving}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {getTimezoneDisplayName(tz)}
              {tz === browserTimezone ? ' (Your browser timezone)' : ''}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-2">
          Event times will be displayed in your selected timezone
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Save Timezone'}
        </Button>

        {!isUsingBrowserTimezone && (
          <Button
            onClick={handleResetToAuto}
            variant="outline"
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Auto
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Info section */}
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-medium mb-2">About Timezones</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Event times are automatically converted to your timezone</li>
          <li>• Your timezone preference is synced across devices</li>
          <li>• Auto-detect uses your browser&apos;s timezone setting</li>
          <li>• Manual selection overrides auto-detection</li>
        </ul>
      </div>
    </div>
  );
}
