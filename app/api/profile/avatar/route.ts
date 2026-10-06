import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbUpsertUser } from "@/lib/user-db";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File terlalu besar (Maks 5MB)" }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Development Storage: local filesystem in public/uploads/avatars
    // NOTE: In production, this should be MinIO, S3, or Corporate Media Service.
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${sessionUser.id}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    // Update user in DB
    await dbUpsertUser({
      id: sessionUser.id,
      name: sessionUser.name,
      businessRole: sessionUser.role,
      avatarUrl
    });

    return NextResponse.json({ avatarUrl });
  } catch (err: any) {
    console.error("[Profile Avatar API] Error uploading avatar:", err);
    return NextResponse.json({ error: "Gagal mengunggah foto profil" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since we don't strictly delete the old file for now, we just remove the reference
    await dbUpsertUser({
      id: sessionUser.id,
      name: sessionUser.name,
      businessRole: sessionUser.role,
      avatarUrl: null
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Profile Avatar API] Error deleting avatar:", err);
    return NextResponse.json({ error: "Gagal menghapus foto profil" }, { status: 500 });
  }
}
