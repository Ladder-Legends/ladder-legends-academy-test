'use client';

import { useState } from 'react';
import { CoachCard } from '@/components/coaches/coach-card';
import type { Coach } from '@/types/coach';
import coachesData from '@/data/coaches.json';
import videos from '@/data/videos.json';
import { CoachEditModal } from '@/components/admin/coach-edit-modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { toast } from 'sonner';

const coaches = coachesData as Coach[];

export function CoachesContent() {
  const { addChange } = usePendingChanges();
  const [selectedRace, setSelectedRace] = useState<string>('all');

  // Modal state for editing
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewCoach, setIsNewCoach] = useState(false);

  // Count videos for each coach
  const getVideoCount = (coachName: string) => {
    return videos.filter(video =>
      video.tags.map(t => t.toLowerCase()).includes(coachName.toLowerCase())
    ).length;
  };

  // Admin handlers
  const handleEdit = (coach: Coach) => {
    setEditingCoach(coach);
    setIsNewCoach(false);
    setIsModalOpen(true);
  };

  const handleDelete = (coach: Coach) => {
    if (confirm(`Are you sure you want to delete coach "${coach.displayName}"?`)) {
      addChange({
        id: coach.id,
        contentType: 'coaches',
        operation: 'delete',
        data: coach as unknown as Record<string, unknown>,
      });
      toast.success(`Coach deleted (pending commit)`);
    }
  };

  const handleAddNew = () => {
    setEditingCoach(null);
    setIsNewCoach(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoach(null);
    setIsNewCoach(false);
  };

  // Filter coaches by race
  const filteredCoaches = selectedRace === 'all'
    ? coaches
    : coaches.filter(coach => coach.race === selectedRace || coach.race === 'all');

  return (
    <main className="flex-1 px-8 py-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Our Coaches</h2>
            <p className="text-muted-foreground">
              Meet our expert coaching team specializing in StarCraft II improvement
            </p>
          </div>
          <PermissionGate require="owner">
            <Button onClick={handleAddNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Coach
            </Button>
          </PermissionGate>
        </div>

        {/* Race Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by race:</span>
          <div className="flex gap-2">
            {['all', 'terran', 'zerg', 'protoss'].map((race) => (
              <button
                key={race}
                onClick={() => setSelectedRace(race)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                  selectedRace === race
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {race}
              </button>
            ))}
          </div>
        </div>

        {/* Coaches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach) => (
            <div key={coach.id} className="relative">
              <CoachCard
                coach={coach}
                videoCount={getVideoCount(coach.name)}
              />
              <PermissionGate require="owner">
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                  <button
                    onClick={() => handleEdit(coach)}
                    className="p-2 bg-card/90 border border-border hover:bg-muted rounded-md transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(coach)}
                    className="p-2 bg-card/90 border border-destructive text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </PermissionGate>
            </div>
          ))}
        </div>

        {filteredCoaches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No coaches found for the selected race.
            </p>
          </div>
        )}
      </div>

      <CoachEditModal
        coach={editingCoach}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewCoach}
      />
    </main>
  );
}
