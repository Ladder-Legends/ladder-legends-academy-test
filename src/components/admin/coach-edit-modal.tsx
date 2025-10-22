'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { Coach } from '@/types/coach';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import coaches from '@/data/coaches.json';

interface CoachEditModalProps {
  coach: Coach | null;
  isOpen: boolean;
  onClose: () => void;
  isNew?: boolean;
}

export function CoachEditModal({ coach, isOpen, onClose, isNew = false }: CoachEditModalProps) {
  const { addChange } = usePendingChanges();
  const [formData, setFormData] = useState<Partial<Coach>>({});
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [rankInput, setRankInput] = useState('');

  // Get all unique specialties from existing coaches for autocomplete
  const allExistingSpecialties = useMemo(() => {
    const specialtySet = new Set<string>();
    coaches.forEach(c => c.specialties.forEach(s => specialtySet.add(s)));
    return Array.from(specialtySet).sort();
  }, []);

  // Get all unique ranks from existing coaches for autocomplete
  const allExistingRanks = useMemo(() => {
    const rankSet = new Set<string>();
    coaches.forEach(c => { if (c.rank) rankSet.add(c.rank); });
    return Array.from(rankSet).sort();
  }, []);

  // Filter specialties based on input
  const filteredSpecialties = useMemo(() => {
    if (!specialtyInput.trim()) return [];
    const input = specialtyInput.toLowerCase();
    return allExistingSpecialties
      .filter(s => s.toLowerCase().includes(input) && !formData.specialties?.includes(s))
      .slice(0, 5);
  }, [specialtyInput, allExistingSpecialties, formData.specialties]);

  // Filter ranks based on input
  const filteredRanks = useMemo(() => {
    if (!rankInput.trim()) return [];
    const input = rankInput.toLowerCase();
    return allExistingRanks
      .filter(r => r.toLowerCase().includes(input))
      .slice(0, 5);
  }, [rankInput, allExistingRanks]);

  useEffect(() => {
    if (coach) {
      setFormData(coach);
      setRankInput(coach.rank || '');
    } else if (isNew) {
      setFormData({
        id: uuidv4(),
        name: '',
        displayName: '',
        race: 'terran',
        bio: '',
        specialties: [],
        socialLinks: {},
      });
      setRankInput('');
    }
    setSpecialtyInput('');
  }, [coach, isNew, isOpen]);

  const addSpecialty = (specialty: string) => {
    const trimmedSpecialty = specialty.trim();
    if (trimmedSpecialty && !formData.specialties?.includes(trimmedSpecialty)) {
      setFormData({ ...formData, specialties: [...(formData.specialties || []), trimmedSpecialty] });
    }
    setSpecialtyInput('');
  };

  const removeSpecialty = (specialtyToRemove: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties?.filter(s => s !== specialtyToRemove) || []
    });
  };

  const handleSpecialtyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (specialtyInput.trim()) {
        addSpecialty(specialtyInput);
      }
    }
  };

  const handleSave = () => {
    if (!formData.id || !formData.displayName || !formData.race || !formData.bio) {
      toast.error('Please fill in all required fields (Display Name, Race, Bio)');
      return;
    }

    // Use displayName for both name and displayName to maintain backward compatibility
    const coachData: Coach = {
      id: formData.id,
      name: formData.displayName.toLowerCase().replace(/\s+/g, ''),
      displayName: formData.displayName,
      race: formData.race as 'terran' | 'zerg' | 'protoss' | 'all',
      bio: formData.bio,
      rank: rankInput || undefined,
      specialties: formData.specialties || [],
      bookingUrl: formData.bookingUrl,
      socialLinks: {},
    };

    addChange({
      id: coachData.id,
      contentType: 'coaches',
      operation: isNew ? 'create' : 'update',
      data: coachData as unknown as Record<string, unknown>,
    });

    toast.success(`Coach ${isNew ? 'created' : 'updated'} (pending commit)`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'New Coach' : 'Edit Coach'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Coach Name *</label>
          <input
            type="text"
            value={formData.displayName || ''}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="Hino"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bio *</label>
          <textarea
            value={formData.bio || ''}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            rows={4}
            placeholder="Top 80 GM Zerg since 2015 with semi-pro tournament experience..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Race *</label>
            <select
              value={formData.race || 'terran'}
              onChange={(e) => setFormData({ ...formData, race: e.target.value as 'terran' | 'zerg' | 'protoss' | 'all' })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="terran">Terran</option>
              <option value="zerg">Zerg</option>
              <option value="protoss">Protoss</option>
              <option value="all">All Races</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rank</label>
            <div className="relative">
              <input
                type="text"
                value={rankInput}
                onChange={(e) => setRankInput(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="Grandmaster"
              />

              {/* Rank autocomplete dropdown */}
              {filteredRanks.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredRanks.map((rank) => (
                    <button
                      key={rank}
                      type="button"
                      onClick={() => setRankInput(rank)}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                    >
                      {rank}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Specialties</label>
          <div className="space-y-2">
            {/* Selected specialties */}
            {formData.specialties && formData.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="hover:text-primary/70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Specialty input with autocomplete */}
            <div className="relative">
              <input
                type="text"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={handleSpecialtyInputKeyDown}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                placeholder="Type to add specialties (press Enter)"
              />

              {/* Autocomplete dropdown */}
              {filteredSpecialties.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredSpecialties.map((specialty) => (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() => addSpecialty(specialty)}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                    >
                      {specialty}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Common specialties: Ladder coaching, Build orders, Game fundamentals, etc.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Booking URL</label>
          <input
            type="text"
            value={formData.bookingUrl || ''}
            onChange={(e) => setFormData({ ...formData, bookingUrl: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="https://app.acuityscheduling.com/..."
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Save to Local Storage
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Changes are saved to browser storage. Click the commit button to push to GitHub.
        </p>
      </div>
    </Modal>
  );
}
