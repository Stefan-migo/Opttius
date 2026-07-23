"use client";


import { ResetDemoDialog } from "./ResetDemoDialog";
import { SystemNavGrid } from "./SystemNavGrid";

interface SaaSRecentActivityProps {
  telemetryEnabled: boolean;
  onToggleTelemetry: (enabled: boolean) => void;
  updatingTelemetry: boolean;
  onResetDemo: () => void;
  showResetDemoDialog: boolean;
  onShowResetDemoDialogChange: (open: boolean) => void;
  resettingDemo: boolean;
}

export function SaaSRecentActivity({
  telemetryEnabled,
  onToggleTelemetry,
  updatingTelemetry,
  onResetDemo,
  showResetDemoDialog,
  onShowResetDemoDialogChange,
  resettingDemo,
}: SaaSRecentActivityProps) {
  return (
    <>
      <SystemNavGrid
        telemetryEnabled={telemetryEnabled}
        updatingTelemetry={updatingTelemetry}
        onShowResetDemoDialogChange={onShowResetDemoDialogChange}
        onToggleTelemetry={onToggleTelemetry}
      />

      <ResetDemoDialog
        open={showResetDemoDialog}
        resetting={resettingDemo}
        onOpenChange={onShowResetDemoDialogChange}
        onReset={onResetDemo}
      />
    </>
  );
}
