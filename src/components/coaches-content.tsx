'use client';

import { useState } from 'react';
import { CoachCard } from '@/components/coaches/coach-card';
import type { Coach } from '@/types/coach';
import coachesData from '@/data/coaches.json';
import videos from '@/data/videos.json';

const coaches = coachesData as Coach[];

export function CoachesContent() {
  const [selectedRace, setSelectedRace] = useState<string>('all');

  // Count videos for each coach
  const getVideoCount = (coachName: string) => {
    return videos.filter(video =>
      video.tags.map(t => t.toLowerCase()).includes(coachName.toLowerCase())
    ).length;
  };

  // Filter coaches by race
  const filteredCoaches = selectedRace === 'all'
    ? coaches
    : coaches.filter(coach => coach.race === selectedRace || coach.race === 'all');

  return (
    <main className="flex-1 px-8 py-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Our Coaches</h2>
          <p className="text-muted-foreground">
            Meet our expert coaching team specializing in StarCraft II improvement
          </p>
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
            <CoachCard
              key={coach.id}
              coach={coach}
              videoCount={getVideoCount(coach.name)}
            />
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
    </main>
  );
}
