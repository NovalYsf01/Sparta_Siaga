"use client";

import React, { useState } from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { IncidentHistoryView } from "@/components/history/incident-history-view";
import { MaintenanceTrackingModal } from "@/components/incident/maintenance-tracking-modal";
import { IncidentRecord } from "@/types/incident";

export default function ReportsPage() {
  const { archivedIncidents, activeRole } = useSiaga();
  const [selectedReadOnlyIncident, setSelectedReadOnlyIncident] = useState<IncidentRecord | null>(null);

  return (
    <>
      <IncidentHistoryView
        archivedIncidents={archivedIncidents}
        onSelectIncident={(inc) => setSelectedReadOnlyIncident(inc)}
      />
      {/* Read-Only Incident Detail Modal (History) */}
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
