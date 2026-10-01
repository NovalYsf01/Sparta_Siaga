"use client";

import React, { useState } from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { MaintenanceTrackingModal } from "@/components/incident/maintenance-tracking-modal";
import { ReportCenterView } from "@/components/reports/report-center-view";
import { IncidentRecord } from "@/types/incident";

export default function ReportsPage() {
  const { incidents, activeRole, handleOpenReportModal } = useSiaga();
  const [selectedReadOnlyIncident, setSelectedReadOnlyIncident] = useState<IncidentRecord | null>(null);

  return (
    <>
      <ReportCenterView
        incidents={incidents}
        activeRole={activeRole}
        onCreateReport={() => handleOpenReportModal()}
        onSelectIncident={setSelectedReadOnlyIncident}
      />

      <MaintenanceTrackingModal
        incident={selectedReadOnlyIncident}
        activeRole={activeRole}
        isOpen={!!selectedReadOnlyIncident}
        onClose={() => setSelectedReadOnlyIncident(null)}
        onUpdateProgress={() => {}}
        isReadOnly={true}
      />
    </>
  );
}
