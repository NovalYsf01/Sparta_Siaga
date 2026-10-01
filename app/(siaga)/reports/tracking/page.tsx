"use client";

import React, { useState, useEffect } from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { TrackingReportCenter } from "@/components/reports/tracking-report-center";
import { MaintenanceTrackingModal } from "@/components/incident/maintenance-tracking-modal";
import { IncidentRecord } from "@/types/incident";

export default function TrackingPage() {
  const { incidents, activeRole } = useSiaga();
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);

  // Sync selected incident if it gets updated in the background
  useEffect(() => {
    if (selectedIncident) {
      const updated = incidents.find(i => i.id === selectedIncident.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedIncident)) {
        setSelectedIncident(updated);
      }
    }
  }, [incidents, selectedIncident]);

  return (
    <>
      <TrackingReportCenter
        incidents={incidents}
        onSelectIncident={(inc) => setSelectedIncident(inc)}
      />
      {/* Detail Tracking Modal */}
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
