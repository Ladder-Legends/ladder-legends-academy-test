'use client';

import { useState, useMemo, useCallback } from 'react';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import Link from 'next/link';
import { Play, Clock, Plus, Edit, Trash2, Lock } from 'lucide-react';
import { MasterclassEditModal } from '@/components/admin/masterclass-edit-modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PaywallLink } from '@/components/auth/paywall-link';
import { Button } from '@/components/ui/button';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

const allMasterclasses = masterclassesData as Masterclass[];

export function MasterclassesContent() {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
  const { addChange } = usePendingChanges();
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    coaches: [],
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for editing
  const [editingMasterclass, setEditingMasterclass] = useState<Masterclass | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewMasterclass, setIsNewMasterclass] = useState(false);

  // Handle filter toggle
  const handleItemToggle = (sectionId: string, itemId: string) => {
    setSelectedItems(prev => {
      const current = prev[sectionId] || [];
      const updated = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [sectionId]: updated };
    });
  };

  // Admin handlers
  const handleEdit = (masterclass: Masterclass) => {
    setEditingMasterclass(masterclass);
    setIsNewMasterclass(false);
    setIsModalOpen(true);
  };

  const handleDelete = (masterclass: Masterclass) => {
    if (confirm(`Are you sure you want to delete "${masterclass.title}"?`)) {
      addChange({
        id: masterclass.id,
        contentType: 'masterclasses',
        operation: 'delete',
        data: masterclass as unknown as Record<string, unknown>,
      });
      toast.success(`Masterclass deleted (pending commit)`);
    }
  };

  const handleAddNew = () => {
    setEditingMasterclass(null);
    setIsNewMasterclass(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMasterclass(null);
    setIsNewMasterclass(false);
  };

  // Count masterclasses for each coach with context-aware filtering
  const getCount = useCallback((coachId: string) => {
    return allMasterclasses.filter(mc => {
      // Check if masterclass matches the coach we're counting
      if (mc.coachId !== coachId) return false;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          mc.title.toLowerCase().includes(query) ||
          mc.description.toLowerCase().includes(query) ||
          mc.coach.toLowerCase().includes(query) ||
          mc.race.toLowerCase().includes(query) ||
          (mc.tags && mc.tags.some(tag => tag.toLowerCase().includes(query)));
        if (!matchesSearch) return false;
      }

      return true;
    }).length;
  }, [searchQuery]);

  // Build filter sections with coaches
  const filterSections = useMemo((): FilterSection[] => {
    const coaches = Array.from(new Set(allMasterclasses.map(mc => mc.coachId)));

    return [
      {
        id: 'coaches',
        label: 'Coaches',
        items: coaches.map(coachId => {
          const coachMasterclass = allMasterclasses.find(mc => mc.coachId === coachId);
          return {
            id: coachId,
            label: coachMasterclass?.coach || coachId,
            count: getCount(coachId),
          };
        }),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, getCount]);

  // Filter masterclasses based on search and selected coaches
  const filteredMasterclasses = useMemo(() => {
    let filtered = allMasterclasses;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(mc =>
        mc.title.toLowerCase().includes(query) ||
        mc.description.toLowerCase().includes(query) ||
        mc.coach.toLowerCase().includes(query) ||
        mc.race.toLowerCase().includes(query) ||
        (mc.tags && mc.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    const coachFilters = selectedItems.coaches || [];
    if (coachFilters.length > 0) {
      filtered = filtered.filter(mc => coachFilters.includes(mc.coachId));
    }

    return filtered;
  }, [selectedItems, searchQuery]);

  return (
    <div className="flex flex-1">
      <FilterSidebar
        searchEnabled={true}
        searchPlaceholder="Search masterclasses..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sections={filterSections}
        selectedItems={selectedItems}
        onItemToggle={handleItemToggle}
      />

      <main className="flex-1 px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Masterclasses</h2>
              <p className="text-muted-foreground">
                In-depth video courses from our coaches. Perfect for systematic improvement in specific areas.
              </p>
            </div>
            <PermissionGate require="coaches">
              <Button onClick={handleAddNew} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Masterclass
              </Button>
            </PermissionGate>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredMasterclasses.length} masterclass{filteredMasterclasses.length !== 1 ? 'es' : ''}
              </p>
            </div>

            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Title</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Coach</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Race</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Difficulty</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Duration</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMasterclasses.map((masterclass, index) => (
                    <tr
                      key={masterclass.id}
                      className={`border-t border-border hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/masterclasses/${masterclass.id}`}
                          className="text-base font-medium hover:text-primary transition-colors block"
                        >
                          {masterclass.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed">
                            {masterclass.description}
                          </p>
                          {!masterclass.isFree && !hasSubscriberRole && (
                            <span className="bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium whitespace-nowrap flex-shrink-0">
                              <Lock className="w-2.5 h-2.5" />
                              Premium
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{masterclass.coach}</td>
                      <td className="px-6 py-4 text-sm capitalize">
                        {masterclass.race}
                      </td>
                      <td className="px-6 py-4 text-sm capitalize">
                        {masterclass.difficulty}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {masterclass.duration && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {masterclass.duration}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/masterclasses/${masterclass.id}`}
                            className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 font-medium"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Watch
                          </Link>
                          <PermissionGate require="coaches">
                            <button
                              onClick={() => handleEdit(masterclass)}
                              className="text-sm px-3 py-2 border border-border hover:bg-muted rounded-md transition-colors flex items-center gap-1.5"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(masterclass)}
                              className="text-sm px-3 py-2 border border-destructive text-destructive hover:bg-destructive/10 rounded-md transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMasterclasses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No masterclasses found for this category.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <MasterclassEditModal
        masterclass={editingMasterclass}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewMasterclass}
      />
    </div>
  );
}
