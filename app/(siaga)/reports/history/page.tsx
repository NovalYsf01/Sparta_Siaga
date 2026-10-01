"use client";

import React, { useState } from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { HistoricalReportBrowser } from "@/components/reports/historical-report-browser";
import { MaintenanceTrackingModal } from "@/components/incident/maintenance-tracking-modal";
import { IncidentRecord } from "@/types/incident";

export default function HistoryPage() {
  const { activeRole } = useSiaga();
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);

  return (
    <>
      <HistoricalReportBrowser
        activeRole={activeRole}
        onSelectIncident={(inc) => setSelectedIncident(inc)}
      />
      {/* Detail Modal is READ-ONLY for History */}
      <MaintenanceTrackingModal
        incident={selectedIncident}
        activeRole={activeRole}
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdateProgress={() => {}}
        isReadOnly={true}
      />
    </>
  );
}
