'use client';

import { useState, useMemo } from 'react';
import { FilterSidebar, type FilterSection } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import { MasterclassCard } from './masterclass-card';
import { MasterclassesTable } from './masterclasses-table';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { MasterclassEditModal } from '@/components/admin/masterclass-edit-modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

const allMasterclasses = masterclassesData as Masterclass[];

export function MasterclassesContent() {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
  const { addChange } = usePendingChanges();

  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    coaches: [],
    accessLevel: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingMasterclass, setEditingMasterclass] = useState<Masterclass | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewMasterclass, setIsNewMasterclass] = useState(false);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allMasterclasses.forEach(mc => {
      mc.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  // Get unique coaches
  const allCoaches = useMemo(() => {
    const coaches = new Set<string>();
    allMasterclasses.forEach(mc => coaches.add(mc.coach));
    return Array.from(coaches).sort();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Filter masterclasses
  const filteredMasterclasses = useMemo(() => {
    return allMasterclasses.filter(mc => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !mc.title.toLowerCase().includes(query) &&
          !mc.description.toLowerCase().includes(query) &&
          !mc.coach.toLowerCase().includes(query) &&
          !mc.race.toLowerCase().includes(query) &&
          !mc.tags?.some(tag => tag.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      // Tag filters
      if (selectedTags.length > 0) {
        if (!mc.tags || !selectedTags.every(tag => mc.tags.includes(tag))) {
          return false;
        }
      }

      // Coach filters
      if (selectedItems.coaches && selectedItems.coaches.length > 0) {
        if (!selectedItems.coaches.includes(mc.coach)) return false;
      }

      // Access level filters
      if (selectedItems.accessLevel && selectedItems.accessLevel.length > 0) {
        const isFree = mc.isFree ?? false;
        if (selectedItems.accessLevel.includes('free') && !isFree) return false;
        if (selectedItems.accessLevel.includes('premium') && isFree) return false;
      }

      return true;
    });
  }, [allMasterclasses, selectedItems, selectedTags, searchQuery]);

  // Filter sections
  const filterSections: FilterSection[] = [
    {
      id: 'search',
      title: 'Search',
      type: 'search' as const,
      items: [],
    },
    {
      id: 'coaches',
      title: 'Coach',
      type: 'checkbox' as const,
      items: allCoaches.map(coach => ({ id: coach, label: coach })),
    },
    {
      id: 'accessLevel',
      title: 'Access Level',
      type: 'checkbox' as const,
      items: [
        { id: 'free', label: 'Free' },
        { id: 'premium', label: 'Premium' },
      ],
    },
  ];

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

  // Filter content
  const filterContent = (
    <FilterSidebar
      searchEnabled={true}
      searchPlaceholder="Search masterclasses..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
    />
  );

  // Table content
  const tableContent = (
    <MasterclassesTable
      masterclasses={filteredMasterclasses}
      hasSubscriberRole={hasSubscriberRole}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  // Grid content
  const gridContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredMasterclasses.map(mc => (
        <MasterclassCard
          key={mc.id}
          masterclass={mc}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  // Header actions
  const headerActions = (
    <PermissionGate require="coaches">
      <Button onClick={handleAddNew} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add New Masterclass
      </Button>
    </PermissionGate>
  );

  return (
    <>
      <FilterableContentLayout
        title="Masterclasses"
        description="Deep dive tutorials and advanced strategies from our expert coaches"
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="grid"
        showViewToggle={true}
        headerActions={headerActions}
        resultCount={`Showing ${filteredMasterclasses.length} masterclass${filteredMasterclasses.length !== 1 ? 'es' : ''}`}
        tags={allTags}
        selectedTags={selectedTags}
        onTagToggle={toggleTag}
        onClearTags={() => setSelectedTags([])}
      />

      {/* Edit Modal */}
      <MasterclassEditModal
        masterclass={editingMasterclass}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewMasterclass}
      />
    </>
  );
}
