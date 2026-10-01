"use client";

import React, { useState, useEffect } from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { OperationalReportCenter } from "@/components/reports/operational-report-center";
import { MaintenanceTrackingModal } from "@/components/incident/maintenance-tracking-modal";
import { IncidentRecord } from "@/types/incident";

export default function ReportsPage() {
  const { incidents, handleSelectIncidentForDetail, handleOpenReportModal } = useSiaga();

  return (
    <>
      <OperationalReportCenter
        incidents={incidents}
        onSelectIncident={(inc) => handleSelectIncidentForDetail(inc)}
        onOpenReportModal={() => handleOpenReportModal()}
      />
    </>
  );
}
