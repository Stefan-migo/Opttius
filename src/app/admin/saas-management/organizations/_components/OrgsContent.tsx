"use client";

import OrgDeleteDialog from "./OrgDeleteDialog";
import OrgsFilters from "./OrgsFilters";
import OrgsHeader from "./OrgsHeader";
import OrgsTable from "./OrgsTable";
import { useOrgs } from "./useOrgs";

export default function OrgsContent() {
  const {
    organizations,
    loading,
    error,
    searchTerm,
    tierFilter,
    statusFilter,
    currentPage,
    totalPages,
    totalCount,
    creating,
    selectedOrgs,
    deleteDialogOpen,
    orgToDelete,
    deleting,
    setSearchTerm,
    setTierFilter,
    setStatusFilter,
    setCurrentPage,
    setSelectedOrgs,
    setDeleteDialogOpen,
    handleCreateOrganization,
    handleAction,
    handleBulkAction,
    handleDeleteClick,
    handleDeleteConfirm,
    clearSelection,
  } = useOrgs();

  return (
    <div className="space-y-6 p-6">
      <OrgsHeader creating={creating} onCreateOrg={handleCreateOrganization} />

      <OrgsFilters
        searchTerm={searchTerm}
        selectedCount={selectedOrgs.size}
        statusFilter={statusFilter}
        tierFilter={tierFilter}
        onBulkAction={(action, value) => handleBulkAction(action, value)}
        onClearSelection={clearSelection}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        onStatusFilterChange={setStatusFilter}
        onTierFilterChange={setTierFilter}
      />

      <OrgsTable
        currentPage={currentPage}
        error={error}
        loading={loading}
        organizations={organizations}
        selectedOrgs={selectedOrgs}
        totalCount={totalCount}
        totalPages={totalPages}
        onAction={handleAction}
        onDeleteClick={handleDeleteClick}
        onPageChange={setCurrentPage}
        onSelectAll={(selected) =>
          setSelectedOrgs(
            selected ? new Set(organizations.map((org) => org.id)) : new Set(),
          )
        }
        onSelectOrg={(id, selected) => {
          const newSelected = new Set(selectedOrgs);
          if (selected) newSelected.add(id);
          else newSelected.delete(id);
          setSelectedOrgs(newSelected);
        }}
      />

      <OrgDeleteDialog
        deleting={deleting}
        open={deleteDialogOpen}
        org={orgToDelete}
        onConfirm={handleDeleteConfirm}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
