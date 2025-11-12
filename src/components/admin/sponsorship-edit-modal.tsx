'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Sponsorship, SponsorshipData } from '@/types/sponsorship';
import { Plus, Trash2, Save, X, GripVertical } from 'lucide-react';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { toast } from 'sonner';

interface SponsorshipEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: SponsorshipData;
}

export function SponsorshipEditModal({ isOpen, onClose, currentData }: SponsorshipEditModalProps) {
  const { addChange } = usePendingChanges();
  const [sponsorships, setSponshorships] = useState<Sponsorship[]>(currentData.sponsors);
  const [communityFunding, setCommunityFunding] = useState(currentData.communityFunding);

  useEffect(() => {
    setSponshorships(currentData.sponsors);
    setCommunityFunding(currentData.communityFunding);
  }, [currentData]);

  const addSponsorship = () => {
    const newId = `sponsor-${Date.now()}`;
    const maxOrder = sponsorships.length > 0
      ? Math.max(...sponsorships.map(s => s.displayOrder))
      : 0;

    setSponshorships([
      ...sponsorships,
      {
        id: newId,
        name: '',
        description: '',
        url: '',
        logoUrl: '/sponsorships/placeholder.png',
        displayOrder: maxOrder + 1,
      },
    ]);
  };

  const updateSponsorship = (id: string, field: keyof Sponsorship, value: string | number) => {
    setSponshorships(sponsorships.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const deleteSponsorship = (id: string) => {
    setSponshorships(sponsorships.filter(s => s.id !== id));
  };

  const moveSponsorship = (id: string, direction: 'up' | 'down') => {
    const index = sponsorships.findIndex(s => s.id === id);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sponsorships.length - 1) return;

    const newSponshorships = [...sponsorships];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    [newSponshorships[index], newSponshorships[swapIndex]] =
    [newSponshorships[swapIndex], newSponshorships[index]];

    // Update display orders
    newSponshorships.forEach((s, idx) => {
      s.displayOrder = idx + 1;
    });

    setSponshorships(newSponshorships);
  };

  const handleSave = () => {
    addChange({
      id: 'sponsorships',
      contentType: 'sponsorships',
      operation: 'update',
      data: {
        communityFunding,
        sponsors: sponsorships,
      },
    });

    toast.success('Sponsorships updated (pending commit)');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Sponsorships & Community Funding" size="xl">
      <div className="space-y-6">
          {/* Community Funding */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <label className="block text-sm font-medium mb-2">
              Community Funding Amount
            </label>
            <input
              type="text"
              value={communityFunding}
              onChange={(e) => setCommunityFunding(e.target.value)}
              placeholder="e.g., $3,500 or £2,800"
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the amount in any format you prefer (e.g., $3,500, £2,800, €3.5k)
            </p>
          </div>

          {/* Sponsorships List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Community Partners</h3>
              <Button onClick={addSponsorship} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Partner
              </Button>
            </div>

            {sponsorships.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                No sponsors added yet. Click &quot;Add Partner&quot; to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {sponsorships
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((sponsor, index) => (
                    <div
                      key={sponsor.id}
                      className="border border-border rounded-lg p-4 bg-card space-y-3"
                    >
                      <div className="flex items-start gap-4">
                        {/* Drag Handle & Order Controls */}
                        <div className="flex flex-col gap-1 pt-1">
                          <button
                            onClick={() => moveSponsorship(sponsor.id, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-muted rounded disabled:opacity-30"
                            title="Move up"
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-muted-foreground text-center">
                            {index + 1}
                          </span>
                          <button
                            onClick={() => moveSponsorship(sponsor.id, 'down')}
                            disabled={index === sponsorships.length - 1}
                            className="p-1 hover:bg-muted rounded disabled:opacity-30"
                            title="Move down"
                          >
                            <GripVertical className="w-4 h-4 rotate-180" />
                          </button>
                        </div>

                        {/* Form Fields */}
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Partner Name</label>
                            <input
                              type="text"
                              value={sponsor.name}
                              onChange={(e) => updateSponsorship(sponsor.id, 'name', e.target.value)}
                              placeholder="e.g., SC2 Pulse"
                              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Website URL</label>
                            <input
                              type="url"
                              value={sponsor.url}
                              onChange={(e) => updateSponsorship(sponsor.id, 'url', e.target.value)}
                              placeholder="https://..."
                              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1">Description</label>
                            <input
                              type="text"
                              value={sponsor.description}
                              onChange={(e) => updateSponsorship(sponsor.id, 'description', e.target.value)}
                              placeholder="Brief description"
                              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1">Logo URL</label>
                            <input
                              type="text"
                              value={sponsor.logoUrl}
                              onChange={(e) => updateSponsorship(sponsor.id, 'logoUrl', e.target.value)}
                              placeholder="/sponsorships/logo.png"
                              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Upload logo to /public/sponsorships/ folder
                            </p>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => deleteSponsorship(sponsor.id)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Delete sponsor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
    </Modal>
  );
}
