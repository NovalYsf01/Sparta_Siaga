import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { checkUserPermission } from "@/lib/permission-service";
import { ProgressService, PhotoType } from "@/lib/progress-service";
import { processAndWatermarkPhoto, validateImageMagicBytes } from "@/lib/watermark";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Akun System Administrator tidak memiliki izin melakukan tindakan operasional." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    }

    // Permission check REPORT_UPDATE_PROGRESS or REPORT_CLOSE
    const permCheck = await checkUserPermission({
      user: sessionUser,
      permission: "REPORT_UPDATE_PROGRESS",
      report: incident,
    });

    if (!permCheck.authorized) {
      return NextResponse.json(
        {
          error:
            permCheck.reason ||
            "Unauthorized: Anda tidak memiliki izin untuk mengunggah bukti akhir pada laporan ini.",
        },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Format request harus multipart/form-data." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const rawPhotoType = (formData.get("photo_type") as string) || "FINAL";
    const photoType: PhotoType = rawPhotoType.toUpperCase() === "HANDOVER" ? "HANDOVER" : "FINAL";
    const description = (formData.get("description") || "Upload bukti akhir pekerjaan / serah terima.").toString().trim();

    const fileEntries: File[] = [];
    for (const [key, val] of formData.entries()) {
      if ((key === "photo" || key === "photos" || key === "file" || key === "files") && val instanceof File) {
        if (val.size > 0) fileEntries.push(val);
      }
    }

    if (fileEntries.length === 0) {
      return NextResponse.json(
        { error: "Foto bukti akhir wajib dilampirkan minimal 1 foto." },
        { status: 400 }
      );
    }

    // Progress percentage is 100 for final evidence
    const percentage = 100;

    const processedPhotos: Array<{
      photoType: PhotoType;
      originalPath: string;
      watermarkedPath: string;
      fileSize: number;
      mimeType: string;
    }> = [];

    for (const file of fileEntries) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Ukuran file ${file.name} melebihi batas maksimal 10MB.` },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { valid, mimeType } = validateImageMagicBytes(buffer);
      if (!valid) {
        return NextResponse.json(
          {
            error: `File ${file.name} bukan format gambar valid. Hanya JPEG, PNG, dan WEBP yang diizinkan.`,
          },
          { status: 400 }
        );
      }

      const wmResult = await processAndWatermarkPhoto(buffer, {
        reportId: id,
        reportNumber: incident.id,
        storeName: incident.storeName || "Toko Cabang",
        progressPercentage: percentage,
        actorName: sessionUser.name,
        photoType,
      });

      processedPhotos.push({
        photoType,
        originalPath: wmResult.originalPath,
        watermarkedPath: wmResult.watermarkedPath,
        fileSize: wmResult.fileSize,
        mimeType: wmResult.mimeType,
      });
    }

    const createdUpdate = await ProgressService.createProgressUpdate({
      reportId: id,
      progressPercentage: percentage,
      description,
      stage: photoType === "HANDOVER" ? "SERAH_TERIMA" : "SELESAI",
      notes: "Foto bukti akhir pekerjaan terverifikasi.",
      actor: {
        id: sessionUser.id,
        name: sessionUser.name,
        branch: sessionUser.branch,
      },
      photos: processedPhotos,
    });

    // Transform response photo paths to protected API URLs
    const protectedResult = {
      ...createdUpdate,
      photos: createdUpdate.photos.map((photo) => ({
        ...photo,
        watermarkedPath: `/api/incidents/${id}/progress/evidence/${encodeURIComponent(photo.watermarkedPath.split('/').pop() || photo.watermarkedPath)}`,
        originalPath: `/api/incidents/${id}/progress/evidence/${encodeURIComponent(photo.originalPath.split('/').pop() || photo.originalPath)}`,
      })),
    };

    return NextResponse.json(
      {
        message: "Bukti akhir pekerjaan berhasil diunggah.",
        data: protectedResult,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/incidents/:id/progress/final]", err);
    if (err.status) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Gagal mengunggah bukti akhir pekerjaan." },
      { status: 500 }
    );
  }
}
