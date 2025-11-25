'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FilterSidebar } from '@/components/shared/filter-sidebar';
import { FilterableContentLayout } from '@/components/ui/filterable-content-layout';
import { useContentFiltering } from '@/lib/filtering/hooks/use-content-filtering';
import { buildOrderFilterConfig } from '@/lib/filtering/configs/build-order-filters';
import { buildOrders as allBuildOrders } from '@/lib/data';
import { BuildOrder } from '@/types/build-order';
import { BuildOrderCard } from './build-order-card';
import { BuildOrdersTable } from './build-orders-table';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/permission-gate';
import { BuildOrderEditModal } from '@/components/admin/build-order-edit-modal';
import { usePendingChanges } from '@/hooks/use-pending-changes';
import { toast } from 'sonner';

export function BuildOrdersContent() {
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
  } = useContentFiltering(allBuildOrders, buildOrderFilterConfig);

  // Sort build orders: for free users, free content first then newest; for premium users, just newest
  const filteredBuildOrders = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // For non-subscribers, prioritize free content first
      if (!hasSubscriberRole) {
        const aIsFree = a.isFree ?? false;
        const bIsFree = b.isFree ?? false;
        if (aIsFree !== bIsFree) {
          return bIsFree ? 1 : -1; // Free items come first
        }
      }

      // Then sort by date (newest first)
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [filtered, hasSubscriberRole]);

  const [editingBuildOrder, setEditingBuildOrder] = useState<BuildOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewBuildOrder, setIsNewBuildOrder] = useState(false);

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

  const handleEdit = (buildOrder: BuildOrder) => {
    setEditingBuildOrder(buildOrder);
    setIsNewBuildOrder(false);
    setIsModalOpen(true);
  };

  const handleDelete = (buildOrder: BuildOrder) => {
    if (confirm(`Are you sure you want to delete "${buildOrder.name}"?`)) {
      addChange({
        id: buildOrder.id,
        contentType: 'build-orders',
        operation: 'delete',
        data: buildOrder,
      });
      toast.success(`Build order deleted (pending commit)`);
    }
  };

  const handleAddNew = () => {
    setEditingBuildOrder(null);
    setIsNewBuildOrder(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBuildOrder(null);
    setIsNewBuildOrder(false);
  };

  // Filter content
  const filterContent = (
    <FilterSidebar
      searchEnabled={true}
      searchPlaceholder="Search build orders..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sections={filterSections}
      selectedItems={selectedItems}
      onSelectionChange={handleSelectionChange}
    />
  );

  // Table content
  const tableContent = (
    <BuildOrdersTable
      buildOrders={filteredBuildOrders}
      hasSubscriberRole={hasSubscriberRole}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  // Grid content
  const gridContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredBuildOrders.map(bo => (
        <BuildOrderCard
          key={bo.id}
          buildOrder={bo}
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
        Add New Build Order
      </Button>
    </PermissionGate>
  );

  return (
    <>
      <FilterableContentLayout
        title="Build Orders"
        description="Master proven build orders from our expert coaches. Each build includes detailed timings, supply counts, and linked video demonstrations."
        pageKey="build-orders"
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
        filterLabels={{
          races: 'Race',
          vsRaces: 'Vs Race',
          types: 'Type',
          categories: 'Category',
        }}
      />

      <BuildOrderEditModal
        buildOrder={editingBuildOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isNew={isNewBuildOrder}
      />
    </>
  );
}
