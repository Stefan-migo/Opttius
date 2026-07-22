"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  LeadAIGeneratorModal,
  type LeadAIGeneratorModalProps,
} from "@/components/admin/saas-management/leads/LeadAIGeneratorModal";
import {
  type LeadDetail,
  LeadDetailPanel,
} from "@/components/admin/saas-management/leads/LeadDetailPanel";
import {
  LeadEmailModal,
  type LeadEmailModalProps,
} from "@/components/admin/saas-management/leads/LeadEmailModal";
import { Button } from "@/components/ui/button";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { FunnelDialog } from "./FunnelDialog";
import { PipelineSection } from "./PipelineSection";
import { StatsCards } from "./StatsCards";
import { useNewUsersFlow } from "./useNewUsersFlow";

export default function NewUsersFlowContent() {
  const router = useRouter();
  const {
    requests,
    stats,
    loading,
    actioning,
    tab,
    viewMode,
    selectedRequest,
    funnelModalOpen,
    funnelForm,
    deleteConfirmOpen,
    requestToDelete,
    detailPanelOpen,
    emailModalOpen,
    aiModalOpen,
    setTab,
    setViewMode,
    setFunnelModalOpen,
    setFunnelForm,
    setDeleteConfirmOpen,
    setRequestToDelete,
    setDetailPanelOpen,
    setEmailModalOpen,
    setAiModalOpen,
    handleApprove,
    handleDeleteClick,
    handleDeleteConfirm,
    handleReject,
    handleFunnelUpdate,
    handleKanbanStageChange,
    openLeadModal,
    openLegacyModal,
    handleSendEmail,
    handleGenerateAIEmail,
  } = useNewUsersFlow();

  return (
    <div className="min-h-screen bg-[#0D1117] space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Pipeline de Leads
          </h1>
          <p className="text-white/50 mt-1">
            Gestiona tus leads y sigue el funnel de ventas
          </p>
        </div>
        <Button
          size="icon"
          title="Volver al dashboard"
          variant="outline"
          onClick={() => router.push("/admin/saas-management/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {stats && <StatsCards stats={stats} />}

      <PipelineSection
        actioning={actioning}
        loading={loading}
        requests={requests}
        tab={tab}
        viewMode={viewMode}
        onApprove={handleApprove}
        onDeleteClick={handleDeleteClick}
        onOpenLeadModal={openLegacyModal}
        onReject={handleReject}
        onStageChange={handleKanbanStageChange}
        onTabChange={setTab}
        onViewModeChange={setViewMode}
      />

      <FunnelDialog
        actioning={actioning}
        funnelForm={funnelForm}
        open={funnelModalOpen}
        selectedRequest={selectedRequest}
        onDeleteClick={handleDeleteClick}
        onFormChange={(field, value) =>
          setFunnelForm((f) => ({ ...f, [field]: value }))
        }
        onFunnelUpdate={handleFunnelUpdate}
        onOpenChange={setFunnelModalOpen}
      />

      <DeleteConfirmDialog
        actioning={actioning}
        open={deleteConfirmOpen}
        requestToDelete={requestToDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setRequestToDelete(null);
        }}
        onDeleteConfirm={handleDeleteConfirm}
        onOpenChange={setDeleteConfirmOpen}
      />

      <LeadDetailPanel
        actioning={actioning}
        lead={selectedRequest as LeadDetail}
        open={detailPanelOpen}
        onApprove={handleApprove}
        onGenerateAIEmail={() => {
          setDetailPanelOpen(false);
          setAiModalOpen(true);
        }}
        onOpenChange={setDetailPanelOpen}
        onReject={handleReject}
        onSendEmail={() => {
          setDetailPanelOpen(false);
          setEmailModalOpen(true);
        }}
        onUpdateStage={handleFunnelUpdate}
      />

      <LeadEmailModal
        lead={selectedRequest as LeadEmailModalProps["lead"]}
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        onSend={handleSendEmail}
      />

      <LeadAIGeneratorModal
        lead={selectedRequest as LeadAIGeneratorModalProps["lead"]}
        open={aiModalOpen}
        onGenerate={handleGenerateAIEmail}
        onOpenChange={setAiModalOpen}
        onSend={handleSendEmail}
      />
    </div>
  );
}
