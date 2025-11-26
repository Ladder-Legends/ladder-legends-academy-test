'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Modal } from '@/components/ui/modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useTheme } from '@/hooks/use-theme';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { Event, EventType } from '@/types/event';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { events as eventsData } from '@/lib/data';
import { CoachSelector } from '@/components/shared/coach-selector';
import { VideoSelector } from '@/components/admin/video-selector';
import { MultiCategorySelector } from './multi-category-selector';
import { FormField } from './form-field';
import { EditModalFooter } from './edit-modal-footer';
import { TIMEZONES, getTimezoneDisplayName } from '@/lib/timezone-utils';
import { getCoachForUser } from '@/lib/coach-utils';
import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface EventEditModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

const allEvents = eventsData as Event[];

const eventTypeOptions: { value: EventType; label: string }[] = [
  { value: 'tournament', label: 'Tournament' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'casting', label: 'Casting' },
  { value: 'streaming', label: 'Streaming' },
  { value: 'replay-analysis', label: 'Replay analysis' },
  { value: 'arcade', label: 'Arcade' },
  { value: 'other', label: 'Other' },
];

const accessLevelOptions = [
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
];

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const dayOfWeekOptions = [
  { value: '', label: 'Select day' },
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export function EventEditModal({ event, isOpen, onClose, isNew = false }: EventEditModalProps) {
  const { data: session } = useSession();
  const { addChange } = usePendingChanges();
  const { theme } = useTheme();
  const { timezone: userTimezone, isLoading: timezoneLoading } = useUserTimezone();

  const [formData, setFormData] = useState<Partial<Event>>({});

  // Get default coach for logged-in user
  const defaultCoach = useMemo(() =>
    getCoachForUser(session?.user?.discordId, session?.user?.name ?? undefined),
    [session?.user?.discordId, session?.user?.name]
  );

  const timezoneOptions = TIMEZONES.map(tz => ({
    value: tz,
    label: getTimezoneDisplayName(tz),
  }));

  useEffect(() => {
    if (!isOpen) return;

    if (event) {
      setFormData(event);
    } else if (isNew && !timezoneLoading) {
      setFormData({
        title: '',
        description: '',
        type: 'tournament',
        date: '',
        time: '18:00',
        timezone: userTimezone,
        duration: 60,
        coach: defaultCoach?.id ?? '', // Events use coach ID
        isFree: false,
        tags: [],
        recurring: {
          enabled: false,
          frequency: 'weekly',
        },
      });
    }
   
  }, [event, isNew, isOpen, userTimezone, timezoneLoading, defaultCoach]);

  const updateField = <K extends keyof Event>(field: K, value: Event[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.title?.trim()) {
      toast.error('Event title is required');
      return;
    }
    if (!formData.description?.trim()) {
      toast.error('Event description is required');
      return;
    }
    if (!formData.date) {
      toast.error('Event date is required');
      return;
    }

    const eventData: Event = {
      id: event?.id || `event-${uuidv4()}`,
      title: formData.title!,
      description: formData.description!,
      type: formData.type!,
      date: formData.date!,
      time: formData.time!,
      timezone: formData.timezone!,
      duration: formData.duration,
      coach: formData.coach || undefined,
      videoIds: formData.videoIds || [],
      isFree: formData.isFree!,
      tags: formData.tags || [],
      recurring: formData.recurring,
      createdAt: event?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const isDuplicate = allEvents.some(
      (e) => e.id === eventData.id && e.id !== event?.id
    );

    if (isDuplicate) {
      toast.error('An event with this ID already exists');
      return;
    }

    addChange({
      id: eventData.id,
      contentType: 'events',
      operation: isNew ? 'create' : 'update',
      data: eventData,
    });

    toast.success(isNew ? 'Event created' : 'Event updated');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Create New Event' : 'Edit Event'}
      size="xl"
    >
      <div className="space-y-6">
        <FormField
          label="Title"
          required
          type="text"
          inputProps={{
            value: formData.title || '',
            onChange: (e) => updateField('title', e.target.value),
            placeholder: 'Weekly Team Games Night',
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Event Type"
            required
            type="select"
            options={eventTypeOptions}
            inputProps={{
              value: formData.type || 'tournament',
              onChange: (e) => updateField('type', e.target.value as EventType),
            }}
          />
          <FormField
            label="Access Level"
            type="select"
            options={accessLevelOptions}
            inputProps={{
              value: formData.isFree ? 'free' : 'premium',
              onChange: (e) => updateField('isFree', e.target.value === 'free'),
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="Date"
            required
            type="date"
            inputProps={{
              value: formData.date || '',
              onChange: (e) => updateField('date', e.target.value),
            }}
          />
          <FormField
            label="Time"
            required
            type="time"
            inputProps={{
              value: formData.time || '',
              onChange: (e) => updateField('time', e.target.value),
            }}
          />
          <FormField
            label="Timezone"
            type="select"
            options={timezoneOptions}
            inputProps={{
              value: formData.timezone || '',
              onChange: (e) => updateField('timezone', e.target.value),
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Duration (minutes)"
            type="number"
            inputProps={{
              value: formData.duration || '',
              onChange: (e) => updateField('duration', parseInt(e.target.value) || undefined),
              placeholder: '60',
              min: 1,
            }}
          />
          <div>
            <label className="block text-sm font-medium mb-2">Coach (Optional)</label>
            <CoachSelector
              value={formData.coach || ''}
              onChange={(coachId) => updateField('coach', coachId)}
            />
          </div>
        </div>

        {/* Videos Section */}
        <div className="border border-border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-medium mb-3">Associated Videos (Optional)</h3>
          <div className="space-y-3">
            {formData.videoIds && formData.videoIds.length > 0 && (
              <div className="space-y-2">
                {formData.videoIds.map((videoId, index) => (
                  <div
                    key={videoId}
                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-background"
                  >
                    <span className="text-sm text-muted-foreground font-medium w-6">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-sm">{videoId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('videoIds', formData.videoIds?.filter(id => id !== videoId) || []);
                      }}
                      className="text-destructive hover:text-destructive/70"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <VideoSelector
              selectedVideoId={undefined}
              onVideoSelect={(videoId) => {
                if (videoId && !formData.videoIds?.includes(videoId)) {
                  updateField('videoIds', [...(formData.videoIds || []), videoId]);
                }
              }}
              label="Add Video"
              suggestedTitle={formData.title || ''}
            />
            <p className="text-xs text-muted-foreground">
              Attach videos to this event (e.g., recordings, tutorials, or related content).
            </p>
          </div>
        </div>

        {/* Recurring Event Settings */}
        <div className="border border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="recurring-enabled"
              checked={formData.recurring?.enabled || false}
              onChange={(e) =>
                updateField('recurring', {
                  ...(formData.recurring || {}),
                  enabled: e.target.checked,
                  frequency: formData.recurring?.frequency || 'weekly',
                })
              }
              className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
            />
            <label htmlFor="recurring-enabled" className="text-sm font-medium">
              Recurring Event
            </label>
          </div>

          {formData.recurring?.enabled && (
            <div className="space-y-4">
              <FormField
                label="Frequency"
                type="select"
                options={frequencyOptions}
                inputProps={{
                  value: formData.recurring?.frequency || 'weekly',
                  onChange: (e) =>
                    updateField('recurring', {
                      ...formData.recurring!,
                      frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    }),
                }}
              />

              {formData.recurring?.frequency === 'weekly' && (
                <FormField
                  label="Day of Week"
                  type="select"
                  options={dayOfWeekOptions}
                  inputProps={{
                    value: formData.recurring?.dayOfWeek?.toString() ?? '',
                    onChange: (e) =>
                      updateField('recurring', {
                        ...formData.recurring!,
                        dayOfWeek: parseInt(e.target.value),
                      }),
                  }}
                />
              )}

              {formData.recurring?.frequency === 'monthly' && (
                <FormField
                  label="Day of Month"
                  type="number"
                  inputProps={{
                    value: formData.recurring?.dayOfMonth ?? '',
                    onChange: (e) =>
                      updateField('recurring', {
                        ...formData.recurring!,
                        dayOfMonth: parseInt(e.target.value),
                      }),
                    placeholder: '1-31',
                    min: 1,
                    max: 31,
                  }}
                />
              )}

              <FormField
                label="End Date (Optional)"
                type="date"
                inputProps={{
                  value: formData.recurring?.endDate || '',
                  onChange: (e) =>
                    updateField('recurring', {
                      ...formData.recurring!,
                      endDate: e.target.value || undefined,
                    }),
                }}
              />
            </div>
          )}
        </div>

        {/* Description - Markdown Editor */}
        <div>
          <label className="block text-sm font-medium mb-2">Description * (Markdown supported)</label>
          <div data-color-mode={theme}>
            <MDEditor
              value={formData.description}
              onChange={(value) => updateField('description', value || '')}
              preview="edit"
              height={300}
            />
          </div>
        </div>

        <MultiCategorySelector
          categories={formData.categories || []}
          onChange={(categories) => updateField('categories', categories)}
        />

        <EditModalFooter
          onSave={handleSave}
          onCancel={onClose}
          isNew={isNew}
          saveText={isNew ? 'Create Event' : 'Save Changes'}
          showHelpText={false}
        />
      </div>
    </Modal>
  );
}
