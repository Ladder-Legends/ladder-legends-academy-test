'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FilterSidebar } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import { useContentFiltering } from '@/lib/filtering/hooks/use-content-filtering';
import { masterclassFilterConfig } from '@/lib/filtering/configs/masterclass-filters';
import masterclassesData from '@/data/masterclasses.json';
import { Masterclass } from '@/types/masterclass';
import { MasterclassCard } from './masterclass-card';
import { MasterclassesTable } from './masterclasses-table';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { MasterclassEditModal } from '@/components/admin/masterclass-edit-modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { toast } from 'sonner';

const allMasterclasses = masterclassesData as Masterclass[];

export function MasterclassesContent() {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
  const { addChange } = usePendingChanges();

  // Use the new filtering system
  const {
    filtered,
    filters,
    setFilter,
    clearFilters,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    sections: filterSections,
  } = useContentFiltering(allMasterclasses, masterclassFilterConfig);

  // Sort masterclasses: for free users, free content first then newest; for premium users, just newest
  const filteredMasterclasses = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // For non-subscribers, prioritize free content first
      if (!hasSubscriberRole) {
        const aIsFree = a.isFree ?? false;
        const bIsFree = b.isFree ?? false;
        if (aIsFree !== bIsFree) {
          return bIsFree ? 1 : -1; // Free items come first
        }
      }

      // Then sort by created date (newest first)
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [filtered, hasSubscriberRole]);

  const [editingMasterclass, setEditingMasterclass] = useState<Masterclass | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewMasterclass, setIsNewMasterclass] = useState(false);

  // Convert filters object to selectedItems format for FilterSidebar
  const selectedItems = useMemo(() => {
    const result: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        result[key] = value;
      } else if (value) {
        result[key] = [String(value)];
      } else {
        result[key] = [];
      }
    }

    return result;
  }, [filters]);

  // Handle selection changes from FilterSidebar
  const handleSelectionChange = (newSelectedItems: Record<string, string[]>) => {
    for (const [key, value] of Object.entries(newSelectedItems)) {
      if (JSON.stringify(selectedItems[key]) !== JSON.stringify(value)) {
        setFilter(key, value);
      }
    }
  };

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
        data: masterclass,
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
      onSelectionChange={handleSelectionChange}
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
        pageKey="masterclasses"
        filterContent={filterContent}
        tableContent={tableContent}
        gridContent={gridContent}
        defaultView="grid"
        showViewToggle={true}
        headerActions={headerActions}
        filters={filters}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        onClearFilters={clearFilters}
        onRemoveFilter={(key) => setFilter(key, [])}
onRemoveFilterValue={(key, value) => {
          const currentValues = filters[key];
          if (Array.isArray(currentValues)) {
            setFilter(key, currentValues.filter(v => v !== value));
          }
        }}
                onClearSearch={() => setSearchQuery('')}
        onRemoveTag={toggleTag}
        filterLabels={{}}
      />

      <MasterclassEditModal
        masterclass={editingMasterclass}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewMasterclass}
      />
    </>
  );
}
