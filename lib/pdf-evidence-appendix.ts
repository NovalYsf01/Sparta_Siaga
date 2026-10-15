/**
 * Append real inspection evidence to a native SPARTA initial-report PDF.
 * Works with the existing SimplePdfDocument (PDF 1.4) without new npm deps.
 * Uses incremental PDF objects and JPEG XObjects; sharp is an existing dep.
 */
import sharp from "sharp";

export interface PdfEvidencePhoto {
  buffer: Buffer;
  label?: string;
}

type JpegImage = { data: Buffer; width: number; height: number };

export async function appendInspectionEvidencePages(
  originalPdf: Buffer,
  photos: PdfEvidencePhoto[]
): Promise<Buffer> {
  if (!photos.length) return originalPdf;

  const trailer = originalPdf.toString("latin1");
  const startxrefMatch = trailer.match(/startxref\s+(\d+)\s+%%EOF\s*$/);
  if (!startxrefMatch) {
    throw new Error("Laporan awal PDF tidak memiliki startxref yang valid.");
  }
  const previousXref = Number(startxrefMatch[1]);
  if (!Number.isSafeInteger(previousXref) || previousXref <= 0) {
    throw new Error("Offset PDF sebelumnya tidak valid.");
  }

  const prepared: JpegImage[] = [];
  for (const photo of photos.slice(0, 6)) {
    const jpeg = await sharp(photo.buffer, { failOn: "error" })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 76 })
      .toBuffer({ resolveWithObject: true });
    if (!jpeg.info.width || !jpeg.info.height || !jpeg.data.length) {
      throw new Error("Foto pemeriksaan gagal diproses menjadi gambar PDF.");
    }
    prepared.push({
      data: jpeg.data,
      width: jpeg.info.width,
      height: jpeg.info.height,
    });
  }
  if (!prepared.length) return originalPdf;

  const offsets = new Map<number, number>();
  const appended: Buffer[] = [];
  let currentOffset = originalPdf.length;

  const appendObject = (objectId: number, parts: Buffer[]): void => {
    const objectBytes = Buffer.concat([
      Buffer.from(String(objectId) + " 0 obj\n", "ascii"),
      ...parts,
      Buffer.from("\nendobj\n", "ascii"),
    ]);
    offsets.set(objectId, currentOffset);
    appended.push(objectBytes);
    currentOffset += objectBytes.length;
  };
  const ascii = (value: string): Buffer => Buffer.from(value, "ascii");
  const fmt = (value: number): string => value.toFixed(2);
  const photoCount = prepared.length;
  const pageIds = prepared.map((_, i) => 7 + i * 3);

  // Supersede the original Pages object, keeping its original main page.
  appendObject(2, [
    ascii("<< /Type /Pages /Kids [3 0 R " +
      pageIds.map(id => String(id) + " 0 R").join(" ") +
      "] /Count " + String(photoCount + 1) + " >>"),
  ]);

  for (let i = 0; i < prepared.length; i++) {
    const photo = prepared[i];
    const pageId = 7 + i * 3;
    const contentId = 8 + i * 3;
    const imageId = 9 + i * 3;

    const widthLimit = 515;
    const heightLimit = 690;
    const ratio = Math.min(widthLimit / photo.width, heightLimit / photo.height);
    const width = photo.width * ratio;
    const height = photo.height * ratio;
    const x = (595.28 - width) / 2;
    const y = 63 + (heightLimit - height) / 2;

    const pageBody =
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] " +
      "/Contents " + String(contentId) + " 0 R " +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> " +
      "/XObject << /Im0 " + String(imageId) + " 0 R >> >> >>";
    appendObject(pageId, [ascii(pageBody)]);

    const contentText =
      "BT /F2 13 Tf 0.07 0.23 0.43 rg " +
      "1 0 0 1 42 791 Tm " +
      "(LAMPIRAN FOTO BUKTI PEMERIKSAAN - " + String(i + 1) + ") Tj ET\n" +
      "BT /F1 9 Tf 0.35 0.40 0.46 rg " +
      "1 0 0 1 42 775 Tm " +
      "(Dokumentasi pemeriksaan lapangan SPARTA SIAGA) Tj ET\n" +
      "q " + fmt(width) + " 0 0 " + fmt(height) + " " +
      fmt(x) + " " + fmt(y) + " cm /Im0 Do Q\n";
    const data = ascii(contentText);
    appendObject(contentId, [
      ascii("<< /Length " + String(data.length) + " >>\nstream\n"),
      data,
      ascii("endstream"),
    ]);

    appendObject(imageId, [
      ascii("<< /Type /XObject /Subtype /Image /Width " +
        String(photo.width) + " /Height " + String(photo.height) +
        " /ColorSpace /DeviceRGB /BitsPerComponent 8 " +
        "/Filter /DCTDecode /Length " + String(photo.data.length) +
        " >>\nstream\n"),
      photo.data,
      ascii("\nendstream"),
    ]);
  }

  const xrefOffset = currentOffset;
  const line = (id: number): string => {
    const n = offsets.get(id);
    if (n === undefined) throw new Error("Missing PDF xref offset " + id);
    return String(n).padStart(10, "0") + " 00000 n \n";
  };
  let xref = "xref\n2 1\n" + line(2);
  xref += "7 " + String(photoCount * 3) + "\n";
  for (let id = 7; id < 7 + photoCount * 3; id++) {
    xref += line(id);
  }

  const ending =
    xref +
    "trailer\n<< /Size " + String(7 + photoCount * 3) +
    " /Root 1 0 R /Prev " + String(previousXref) + " >>\n" +
    "startxref\n" + String(xrefOffset) + "\n%%EOF\n";

  return Buffer.concat([originalPdf, ...appended, ascii(ending)]);
}
