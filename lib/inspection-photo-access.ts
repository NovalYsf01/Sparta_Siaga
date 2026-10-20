import type { IncidentRecord } from "@/types/incident";

/**
 * Images are private report evidence, not independent public assets.
 * A user viewing report A must not be able to ask its endpoint for report B's key.
 */
export function isEvidencePhotoLinked(
  report: IncidentRecord,
  reportId: string,
  photoId: string
): boolean {
  if (!photoId.startsWith("wm_")) return false;
  const prefix = "/api/incidents/" + encodeURIComponent(reportId) + "/inspection/evidence/";
  const references = [
    ...(report.verification?.photos || []),
    ...((report.fieldPhotos || []).map((p) => (typeof p === "string" ? p : p.url))),
    ...(report.verification?.evidenceDetails?.map((e) => e.photoUrl) || []),
  ];
  return references.some(url => {
    if (typeof url !== "string" || !url.startsWith(prefix)) return false;
    try {
      return decodeURIComponent(url.slice(prefix.length)) === photoId;
    } catch {
      return false;
    }
  });
}
