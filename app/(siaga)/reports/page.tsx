"use client";

import React from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { OperationalReportCenter } from "@/components/reports/operational-report-center";

export default function ReportsPage() {
  const { incidents, handleSelectIncidentForDetail, handleOpenReportModal, refreshIncidents } = useSiaga();

  return (
    <>
      <OperationalReportCenter
        incidents={incidents}
        onSelectIncident={(inc) => handleSelectIncidentForDetail(inc)}
        onOpenReportModal={() => handleOpenReportModal()}
        onReportUpdated={refreshIncidents}
      />
    </>
  );
}
