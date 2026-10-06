import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetAllUsers, dbCreateUser, dbGetUserByNik } from "@/lib/user-db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Hanya ADMIN yang dapat mengakses manajemen user." }, { status: 403 });
    }

    const users = await dbGetAllUsers();
    // Never expose passwordHash in API response
    const safeUsers = users.map(({ passwordHash, ...u }) => u);
    return NextResponse.json({ data: safeUsers });
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json({ error: "Gagal memuat daftar user" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Hanya ADMIN yang dapat menambah user." }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name || !body.businessRole) {
      return NextResponse.json({ error: "Data user tidak lengkap" }, { status: 400 });
    }

    if (body.nik && typeof body.nik === "string" && body.nik.trim()) {
      const existingUserWithNik = await dbGetUserByNik(body.nik.trim());
      if (existingUserWithNik) {
        return NextResponse.json({ error: "NIK sudah terdaftar." }, { status: 400 });
      }
    }

    if (body.systemRole === "ADMIN") {
      return NextResponse.json({ error: "System ADMIN hanya dapat dibuat melalui ENV / seed script." }, { status: 400 });
    }

    body.systemRole = "USER";

    if (["ho_admin", "gm_ho", "sm_ho"].includes(body.businessRole)) {
      body.scope = "HO";
      body.branch = null;
    } else if (["bm", "tim_toko", "sparta_maintenance"].includes(body.businessRole)) {
      body.scope = "BRANCH";
      if (!body.branch) {
        return NextResponse.json({ error: "Cabang/Toko wajib diisi untuk role berscope BRANCH" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Business Role tidak valid" }, { status: 400 });
    }

    // Password validation for LOCAL users
    let passwordHash: string | null = null;
    if (body.source !== "SSO") {
      if (!body.password || typeof body.password !== "string" || !body.password.trim()) {
        return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
      }

      if (body.password.length < 8) {
        return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
      }

      if (body.confirmPassword !== undefined && body.password !== body.confirmPassword) {
        return NextResponse.json({ error: "Konfirmasi password tidak sesuai." }, { status: 400 });
      }

      passwordHash = await bcrypt.hash(body.password, 10);
    }

    const id = `usr_local_${Date.now()}`;
    const newUser = await dbCreateUser({
      id,
      name: body.name,
      nik: body.nik || null,
      email: body.email || null,
      systemRole: "USER",
      businessRole: body.businessRole,
      scope: body.scope,
      branch: body.branch,
      status: body.status || "ACTIVE",
      source: body.source || "LOCAL",
      passwordHash,
    });

    // Never expose passwordHash in response
    const { passwordHash: _, ...safeUser } = newUser;
    return NextResponse.json({ data: safeUser }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/users]", error);
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}
