import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getDbPool } from "./db";
import { getPrivateStoragePaths } from "./storage-config";
import { validateImageMagicBytes } from "./watermark";
import { canViewReport, type UserContext } from "./report-permissions";
import { canSubmitInspection } from "./report-workflow-policy";
import type { IncidentRecord } from "../types/incident";
import type { EvidenceOrigin, EvidencePhase, IncidentEvidence } from "../types/report-workflow";

export interface EvidenceMetadataInput { caption: string; origin: EvidenceOrigin; thirdPartySourceName?: string | null; thirdPartySourceDescription?: string | null }
export function validateEvidenceMetadata(input: EvidenceMetadataInput): { valid: boolean; code?: string } {
  if (!input.caption?.trim()) return { valid: false, code: "CAPTION_REQUIRED" };
  if (!["CAMERA_SELF", "GALLERY_SELF", "GALLERY_THIRD_PARTY"].includes(input.origin)) return { valid: false, code: "INVALID_EVIDENCE_ORIGIN" };
  if (input.origin === "GALLERY_THIRD_PARTY" && !input.thirdPartySourceDescription?.trim()) return { valid: false, code: "THIRD_PARTY_SOURCE_REQUIRED" };
  return { valid: true };
}
export function canUploadIncidentEvidence(user: UserContext, report: IncidentRecord): boolean { return canSubmitInspection(user, report); }
export function canReadIncidentEvidence(user: UserContext, report: IncidentRecord): boolean { return canViewReport(user, report); }

export interface SaveEvidenceInput extends EvidenceMetadataInput { report: IncidentRecord; phase: EvidencePhase; buffer: Buffer; originalFilename: string }
export async function saveIncidentEvidence(input: SaveEvidenceInput, actor: UserContext): Promise<IncidentEvidence> {
  if (!canUploadIncidentEvidence(actor, input.report)) throw Object.assign(new Error("Unggah bukti tidak diizinkan."), { code: "EVIDENCE_UPLOAD_FORBIDDEN", status: 403 });
  const metadata = validateEvidenceMetadata(input);
  if (!metadata.valid) throw Object.assign(new Error("Metadata bukti tidak lengkap."), { code: metadata.code, status: 400 });
  if (!["INITIAL", "CLARIFICATION", "FOLLOW_UP"].includes(input.phase)) throw Object.assign(new Error("Fase bukti tidak valid."), { code: "INVALID_EVIDENCE_PHASE", status: 400 });
  if (input.buffer.length === 0 || input.buffer.length > 10 * 1024 * 1024) throw Object.assign(new Error("Ukuran foto tidak valid."), { code: "INVALID_FILE_SIZE", status: 400 });
  const magic = validateImageMagicBytes(input.buffer);
  if (!magic.valid || !magic.mimeType || !["image/jpeg", "image/png", "image/webp"].includes(magic.mimeType)) throw Object.assign(new Error("Format foto tidak valid."), { code: "INVALID_IMAGE", status: 400 });
  await sharp(input.buffer).metadata();
  const extension = magic.mimeType === "image/png" ? "png" : magic.mimeType === "image/webp" ? "webp" : "jpg";
  const id = `evi_${randomUUID()}`;
  const safeReport = input.report.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storageKey = `${safeReport}_${id}.${extension}`;
  const storageDir = getPrivateStoragePaths().incidents;
  await fs.mkdir(storageDir, { recursive: true });
  const diskPath = path.resolve(storageDir, storageKey);
  if (!diskPath.startsWith(path.resolve(storageDir) + path.sep)) throw new Error("Invalid evidence storage path.");
  await fs.writeFile(diskPath, input.buffer, { flag: "wx" });
  const uploadedAt = new Date().toISOString();
  try {
    await getDbPool().query(`INSERT INTO incident_evidence (id, report_id, phase, storage_key, mime_type, file_size, caption, origin, third_party_source_name, third_party_source_description, uploaded_by_user_id, uploaded_by_name, uploaded_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [id, input.report.id, input.phase, storageKey, magic.mimeType, input.buffer.length, input.caption.trim(), input.origin, input.thirdPartySourceName?.trim() || null, input.thirdPartySourceDescription?.trim() || null, actor.id, actor.name, uploadedAt]);
  } catch (error) { await fs.unlink(diskPath).catch(() => undefined); throw error; }
  return { id, reportId: input.report.id, phase: input.phase, storageKey, mimeType: magic.mimeType, fileSize: input.buffer.length, caption: input.caption.trim(), origin: input.origin, thirdPartySourceName: input.thirdPartySourceName?.trim() || null, thirdPartySourceDescription: input.thirdPartySourceDescription?.trim() || null, uploadedByUserId: actor.id, uploadedByName: actor.name, uploadedAt };
}

export async function listIncidentEvidence(report: IncidentRecord, actor: UserContext) {
  if (!canReadIncidentEvidence(actor, report)) throw Object.assign(new Error("Akses bukti ditolak."), { code: "EVIDENCE_READ_FORBIDDEN", status: 403 });
  const { rows } = await getDbPool().query("SELECT * FROM incident_evidence WHERE report_id = $1 ORDER BY uploaded_at", [report.id]);
  const normalized = rows.map((row) => ({ id: row.id, reportId: row.report_id, submissionId: row.submission_id, phase: row.phase, caption: row.caption, origin: row.origin, thirdPartySourceName: row.third_party_source_name, thirdPartySourceDescription: row.third_party_source_description, uploadedByUserId: row.uploaded_by_user_id, uploadedByName: row.uploaded_by_name, uploadedAt: new Date(row.uploaded_at).toISOString(), mimeType: row.mime_type, fileSize: row.file_size, url: `/api/incidents/${encodeURIComponent(report.id)}/evidence/${encodeURIComponent(row.id)}` }));
  const legacy = (report.fieldPhotos || []).filter((url) => /^\/(uploads|api)\//.test(url)).map((url, index) => ({ id: `legacy-${index}`, reportId: report.id, phase: "INITIAL", caption: "Bukti historis — metadata asal tidak tersedia", origin: "LEGACY_UNKNOWN", uploadedByName: "Tidak tercatat", uploadedAt: report.createdAt, url, legacy: true }));
  return [...normalized, ...legacy];
}

export async function getIncidentEvidenceFile(report: IncidentRecord, evidenceId: string, actor: UserContext) {
  if (!canReadIncidentEvidence(actor, report)) throw Object.assign(new Error("Akses bukti ditolak."), { code: "EVIDENCE_READ_FORBIDDEN", status: 403 });
  if (!/^[a-zA-Z0-9_-]+$/.test(evidenceId)) throw Object.assign(new Error("ID bukti tidak valid."), { code: "INVALID_EVIDENCE_ID", status: 400 });
  const { rows } = await getDbPool().query("SELECT * FROM incident_evidence WHERE id = $1 AND report_id = $2", [evidenceId, report.id]);
  const row = rows[0]; if (!row) return null;
  const storageDir = path.resolve(getPrivateStoragePaths().incidents);
  const diskPath = path.resolve(storageDir, row.storage_key);
  if (!diskPath.startsWith(storageDir + path.sep)) throw Object.assign(new Error("Bukti lintas laporan ditolak."), { code: "CROSS_REPORT_EVIDENCE", status: 403 });
  const buffer = await fs.readFile(diskPath);
  return { buffer, mimeType: row.mime_type as string, fileName: path.basename(row.storage_key as string) };
}
