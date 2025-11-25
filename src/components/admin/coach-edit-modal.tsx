'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Coach } from '@/types/coach';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { coaches } from '@/lib/data';
import { FormField } from './form-field';
import { TagInput } from './tag-input';
import { EditModalFooter } from './edit-modal-footer';

interface CoachEditModalProps {
  coach: Coach | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

const raceOptions = [
  { value: 'none', label: 'None / General Coach' },
  { value: 'terran', label: 'Terran' },
  { value: 'zerg', label: 'Zerg' },
  { value: 'protoss', label: 'Protoss' },
  { value: 'all', label: 'All Races' },
];

export function CoachEditModal({ coach, isOpen, onClose, isNew = false }: CoachEditModalProps) {
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<Coach>>({});

  // Get all unique specialties from existing coaches for autocomplete
  const allExistingSpecialties = useMemo(() => {
    const specialtySet = new Set<string>();
    coaches.forEach(c => c.specialties.forEach(s => specialtySet.add(s)));
    return Array.from(specialtySet).sort();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (coach) {
      setFormData(coach);
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        name: '',
        displayName: '',
        race: 'terran',
        bio: '',
        specialties: [],
        socialLinks: {},
        isActive: true,
      });
    }
  }, [coach, isNew, isOpen]);

  const updateField = <K extends keyof Coach>(field: K, value: Coach[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.id || !formData.displayName || !formData.race || !formData.bio) {
      toast.error('Please fill in all required fields (Display Name, Race, Bio)');
      return;
    }

    const coachData: Coach = {
      id: formData.id,
      name: formData.displayName.toLowerCase().replace(/\s+/g, ''),
      displayName: formData.displayName,
      race: formData.race as 'terran' | 'zerg' | 'protoss' | 'all',
      bio: formData.bio,
      specialties: formData.specialties || [],
      bookingUrl: formData.bookingUrl,
      pricePerHour: formData.pricePerHour,
      isActive: formData.isActive !== false,
      socialLinks: {},
    };

    addChange({
      id: coachData.id,
      contentType: 'coaches',
      operation: isNew ? 'create' : 'update',
      data: coachData,
    });

    toast.success(`Coach ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Coach' : 'Edit Coach'} size="lg">
      <div className="space-y-4">
        <FormField
          label="Coach Name"
          required
          type="text"
          inputProps={{
            value: formData.displayName || '',
            onChange: (e) => updateField('displayName', e.target.value),
            placeholder: 'Hino',
            autoFocus: true,
          }}
        />

        <FormField
          label="Bio"
          required
          type="textarea"
          rows={4}
          inputProps={{
            value: formData.bio || '',
            onChange: (e) => updateField('bio', e.target.value),
            placeholder: 'Top 80 GM Zerg since 2015 with semi-pro tournament experience...',
          }}
        />

        <FormField
          label="Race"
          required
          type="select"
          options={raceOptions}
          inputProps={{
            value: formData.race || 'none',
            onChange: (e) => updateField('race', e.target.value as Coach['race']),
          }}
        />

        <TagInput
          tags={formData.specialties || []}
          onChange={(specialties) => updateField('specialties', specialties)}
          existingTags={allExistingSpecialties}
          label="Specialties"
          placeholder="Type to add specialties (press Enter)"
          helpText="Common specialties: Ladder coaching, Build orders, Game fundamentals, etc."
          lowercase={false}
        />

        <FormField
          label="Booking URL"
          type="text"
          inputProps={{
            value: formData.bookingUrl || '',
            onChange: (e) => updateField('bookingUrl', e.target.value),
            placeholder: 'https://app.acuityscheduling.com/...',
          }}
        />

        <FormField
          label="Price Per Hour"
          type="text"
          inputProps={{
            value: formData.pricePerHour || '',
            onChange: (e) => updateField('pricePerHour', e.target.value),
            placeholder: '£25/hr or $30/hr',
          }}
          helpText="Display format for coaching session pricing (e.g., £25/hr, $30/hr)"
        />

        <div className="flex items-center gap-2 p-3 border border-border rounded-md bg-card/50">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive !== false}
            onChange={(e) => updateField('isActive', e.target.checked)}
            className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
          />
          <label htmlFor="isActive" className="text-sm font-medium cursor-pointer flex-1">
            Active Coach
            <p className="text-xs text-muted-foreground font-normal mt-1">
              Inactive coaches are hidden from public pages but their content remains visible
            </p>
          </label>
        </div>

        <EditModalFooter
          onSave={handleSave}
          onCancel={onClose}
          isNew={isNew}
        />
      </div>
    </Modal>
  );
}
