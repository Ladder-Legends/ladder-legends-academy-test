'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useTheme } from '@/hooks/use-theme';
import { Event, EventType } from '@/types/event';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import eventsData from '@/data/events.json';
import { CoachSelector } from '@/components/shared/coach-selector';
import dynamic from 'next/dynamic';

// Dynamically import the markdown editor (client-side only)
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface EventEditModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

const allEvents = eventsData as Event[];

const eventTypes: EventType[] = [
  'tournament',
  'coaching',
  'casting',
  'streaming',
  'replay-analysis',
  'arcade',
  'other',
];

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
];

export function EventEditModal({ event, isOpen, onClose, isNew = false }: EventEditModalProps) {
  const { addChange } = usePendingChanges();
  const { theme } = useTheme();

  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    type: 'tournament',
    date: '',
    time: '18:00',
    timezone: 'America/New_York',
    duration: 60,
    coach: '',
    isFree: false,
    tags: [],
    recurring: {
      enabled: false,
      frequency: 'weekly',
    },
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (event) {
      setFormData(event);
    } else if (isNew) {
      setFormData({
        title: '',
        description: '',
        type: 'tournament',
        date: '',
        time: '18:00',
        timezone: 'America/New_York',
        duration: 60,
        coach: '',
        isFree: false,
        tags: [],
        recurring: {
          enabled: false,
          frequency: 'weekly',
        },
      });
    }
  }, [event, isNew]);

  const handleSave = () => {
    // Validation
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

    // Check for duplicate ID
    const isDuplicate = allEvents.some(
      (e) => e.id === eventData.id && e.id !== event?.id
    );

    if (isDuplicate) {
      toast.error('An event with this ID already exists');
      return;
    }

    // Add to pending changes
    addChange({
      id: eventData.id,
      contentType: 'events',
      operation: isNew ? 'create' : 'update',
      data: eventData as unknown as Record<string, unknown>,
    });

    toast.success(isNew ? 'Event created' : 'Event updated');
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Create New Event' : 'Edit Event'}
      size="xl"
    >
      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Weekly Team Games Night"
          />
        </div>

        {/* Type & Free/Premium */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Event Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Access Level</label>
            <select
              value={formData.isFree ? 'free' : 'premium'}
              onChange={(e) => setFormData({ ...formData, isFree: e.target.value === 'free' })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>

        {/* Date, Time, Timezone */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Time *</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Timezone</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration & Coach */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={formData.duration || ''}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="60"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Coach (Optional)</label>
            <CoachSelector
              value={formData.coach || ''}
              onChange={(coachId) => setFormData({ ...formData, coach: coachId })}
            />
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
                setFormData({
                  ...formData,
                  recurring: {
                    ...(formData.recurring || {}),
                    enabled: e.target.checked,
                    frequency: formData.recurring?.frequency || 'weekly',
                  },
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
              <div>
                <label className="block text-sm font-medium mb-2">Frequency</label>
                <select
                  value={formData.recurring?.frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurring: {
                        ...formData.recurring!,
                        frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {formData.recurring?.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Day of Week</label>
                  <select
                    value={formData.recurring?.dayOfWeek ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurring: {
                          ...formData.recurring!,
                          dayOfWeek: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select day</option>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              )}

              {formData.recurring?.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Day of Month</label>
                  <input
                    type="number"
                    value={formData.recurring?.dayOfMonth ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurring: {
                          ...formData.recurring!,
                          dayOfMonth: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="1-31"
                    min="1"
                    max="31"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.recurring?.endDate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurring: {
                        ...formData.recurring!,
                        endDate: e.target.value || undefined,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Description - Markdown Editor */}
        <div>
          <label className="block text-sm font-medium mb-2">Description * (Markdown supported)</label>
          <div data-color-mode={theme}>
            <MDEditor
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value || '' })}
              preview="edit"
              height={300}
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-2">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Add a tag..."
            />
            <Button type="button" onClick={handleAddTag} size="sm">
              Add Tag
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags?.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button onClick={handleSave} className="flex-1">
            {isNew ? 'Create Event' : 'Save Changes'}
          </Button>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
